import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiAuthPost, apiGet, apiPatch, apiPost, apiPublicGet, ApiError } from "./api";
import { getAccessToken, getRefreshToken, storeTokens } from "./auth";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

// Аннотируем vi.fn() сигнатурой fetch — сама реализация мока может
// игнорировать аргументы (assignable по структурной типизации), но тогда
// fetchMock.mock.calls индексируется как [url, init], а не как []
type FetchMock = (url: string, init?: RequestInit) => Promise<Response>;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiPost (public, unauthenticated)", () => {
  it("sends a JSON POST and returns the parsed body on success", async () => {
    const fetchMock = vi.fn<FetchMock>(async () => jsonResponse(201, { access: "a", refresh: "b" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiPost<{ access: string; refresh: string }>("/api/register/", { username: "me" });

    expect(result).toEqual({ access: "a", refresh: "b" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/register/");
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(init!.body as string)).toEqual({ username: "me" });
  });

  it("throws an ApiError carrying the status and body on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<FetchMock>(async () => jsonResponse(400, { username: ["A user with that username already exists."] })),
    );

    await expect(apiPost("/api/register/", {})).rejects.toMatchObject({
      status: 400,
      body: { username: ["A user with that username already exists."] },
    });
  });

  it("never attaches an Authorization header, even if the caller happens to be logged in", async () => {
    storeTokens("some-access-token", "some-refresh-token");
    const fetchMock = vi.fn<FetchMock>(async () => jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await apiPost("/api/token/", { username: "me", password: "x" });

    const [, init] = fetchMock.mock.calls[0];
    expect(init!.headers).not.toHaveProperty("Authorization");
  });
});

describe("apiPublicGet", () => {
  it("returns the parsed body on success without sending a body or auth header", async () => {
    const fetchMock = vi.fn<FetchMock>(async () => jsonResponse(200, { count: 0, next: null, previous: null, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiPublicGet("/api/products/");

    expect(result).toEqual({ count: 0, next: null, previous: null, results: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/products/");
    expect(init).toBeUndefined();
  });

  it("throws an ApiError on failure (e.g. 404 for a missing product)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<FetchMock>(async () => jsonResponse(404, { detail: "Not found." })),
    );

    await expect(apiPublicGet("/api/products/9999/")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("authRequest (apiGet/apiPatch/apiAuthPost)", () => {
  it("attaches the Authorization header when a token is stored", async () => {
    storeTokens("my-access-token", "my-refresh-token");
    const fetchMock = vi.fn<FetchMock>(async () => jsonResponse(200, { id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/profile/");

    const [, init] = fetchMock.mock.calls[0];
    expect(init!.headers).toMatchObject({ Authorization: "Bearer my-access-token" });
  });

  it("omits the Authorization header when logged out", async () => {
    const fetchMock = vi.fn<FetchMock>(async () => jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await apiGet("/api/profile/");

    const [, init] = fetchMock.mock.calls[0];
    expect(init!.headers).not.toHaveProperty("Authorization");
  });

  it("sends PATCH bodies as JSON with a Content-Type header", async () => {
    storeTokens("access", "refresh");
    const fetchMock = vi.fn<FetchMock>(async () => jsonResponse(200, { email: "new@example.com" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiPatch("/api/profile/", { email: "new@example.com" });

    const [, init] = fetchMock.mock.calls[0];
    expect(init).toMatchObject({ method: "PATCH", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(init!.body as string)).toEqual({ email: "new@example.com" });
  });

  it("uses POST for apiAuthPost", async () => {
    storeTokens("access", "refresh");
    vi.stubGlobal(
      "fetch",
      vi.fn<FetchMock>(async () => jsonResponse(200, { detail: "Пароль успешно изменён." })),
    );

    await apiAuthPost("/api/change-password/", { old_password: "x", new_password: "y", new_password2: "y" });
  });

  it("refreshes the access token once on 401 and retries the original request", async () => {
    storeTokens("expired-access", "valid-refresh");
    let protectedCallCount = 0;
    let refreshCallCount = 0;

    const fetchMock = vi.fn<FetchMock>(async (url: string) => {
      if (url.includes("/api/token/refresh/")) {
        refreshCallCount += 1;
        return jsonResponse(200, { access: "fresh-access" });
      }
      protectedCallCount += 1;
      if (protectedCallCount === 1) return jsonResponse(401, { detail: "Given token not valid" });
      return jsonResponse(200, { id: 1, username: "me" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiGet<{ id: number; username: string }>("/api/profile/");

    expect(result).toEqual({ id: 1, username: "me" });
    expect(refreshCallCount).toBe(1);
    expect(protectedCallCount).toBe(2);
    // setAccessToken() should have applied the refreshed token
    expect(getAccessToken()).toBe("fresh-access");
    // the refresh token itself isn't rotated by the backend
    expect(getRefreshToken()).toBe("valid-refresh");
  });

  it("dedupes concurrent 401s into a single refresh call", async () => {
    storeTokens("expired-access", "valid-refresh");
    let refreshCallCount = 0;
    let protectedCallCount = 0;
    let tokenIsFresh = false;

    const fetchMock = vi.fn<FetchMock>(async (url: string) => {
      if (url.includes("/api/token/refresh/")) {
        refreshCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        tokenIsFresh = true;
        return jsonResponse(200, { access: "fresh-access" });
      }
      protectedCallCount += 1;
      return tokenIsFresh ? jsonResponse(200, { ok: true }) : jsonResponse(401, {});
    });
    vi.stubGlobal("fetch", fetchMock);

    const [a, b] = await Promise.all([apiGet("/api/a/"), apiGet("/api/b/")]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshCallCount).toBe(1);
    // 2 initial 401s + 2 successful retries
    expect(protectedCallCount).toBe(4);
  });

  it("clears tokens and rejects with the ORIGINAL 401 when refresh also fails", async () => {
    storeTokens("expired-access", "invalid-refresh");

    vi.stubGlobal(
      "fetch",
      vi.fn<FetchMock>(async (url: string) => {
        if (url.includes("/api/token/refresh/")) {
          return jsonResponse(401, { detail: "Token is invalid" });
        }
        return jsonResponse(401, { detail: "original request expired" });
      }),
    );

    await expect(apiGet("/api/profile/")).rejects.toMatchObject({
      status: 401,
      body: { detail: "original request expired" },
    });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("never calls the refresh endpoint when there is no refresh token to use", async () => {
    // logged out entirely — no tokens in storage
    const fetchMock = vi.fn<FetchMock>(async () => jsonResponse(401, { detail: "Authentication credentials were not provided." }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiGet("/api/profile/")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
