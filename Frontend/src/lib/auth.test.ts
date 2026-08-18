import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_CHANGE_EVENT, clearTokens, getAccessToken, getRefreshToken, setAccessToken, storeTokens } from "./auth";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("storeTokens", () => {
  it("stores both tokens so they can be read back", () => {
    storeTokens("access-1", "refresh-1");
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
  });

  it("notifies listeners so components like Header can react without a reload", () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_CHANGE_EVENT, listener);
    storeTokens("access-1", "refresh-1");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("setAccessToken", () => {
  it("updates only the access token, leaving the refresh token untouched", () => {
    storeTokens("access-1", "refresh-1");
    setAccessToken("access-2");
    expect(getAccessToken()).toBe("access-2");
    expect(getRefreshToken()).toBe("refresh-1");
  });

  it("does not fire the auth-change event, since login state doesn't change on refresh", () => {
    storeTokens("access-1", "refresh-1");
    const listener = vi.fn();
    window.addEventListener(AUTH_CHANGE_EVENT, listener);
    setAccessToken("access-2");
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("clearTokens", () => {
  it("removes both tokens", () => {
    storeTokens("access-1", "refresh-1");
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("notifies listeners", () => {
    storeTokens("access-1", "refresh-1");
    const listener = vi.fn();
    window.addEventListener(AUTH_CHANGE_EVENT, listener);
    clearTokens();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("getAccessToken / getRefreshToken", () => {
  it("return null when nothing has been stored yet", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
