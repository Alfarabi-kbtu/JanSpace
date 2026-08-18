import { clearTokens, getAccessToken, getRefreshToken, setAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ApiError несёт и HTTP-статус, и тело ответа — parseApiError (errors.ts)
// разбирает body, чтобы разложить ошибки DRF по полям формы
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function parseBody(res: Response): Promise<unknown> {
  // Тело может отсутствовать (например, при сетевой ошибке до сервера) —
  // не даём JSON.parse уронить весь запрос
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }

  return body as T;
}

// Публичные GET-эндпоинты (категории/товары/услуги — чтение доступно всем,
// см. Frontend/CLAUDE.md) — без Authorization-заголовка и без refresh-flow,
// он им не нужен: анонимный запрос никогда не вернёт 401
export async function apiPublicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  const body = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}

type AuthMethod = "GET" | "POST" | "PATCH" | "PUT";

// Один общий refresh на все запросы, упавшие 401 одновременно — без этого
// несколько параллельных authRequest() устроили бы гонку и дёргали
// /api/token/refresh/ по несколько раз разом
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = getRefreshToken();
      if (!refresh) {
        clearTokens();
        throw new ApiError(401, null);
      }

      const res = await fetch(`${API_URL}/api/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      if (!res.ok) {
        // Refresh-токен тоже просрочен/невалиден (живёт 7 дней) — дальше
        // поможет только повторный логин, поэтому сразу чистим токены
        clearTokens();
        throw new ApiError(res.status, await parseBody(res));
      }

      const body = (await res.json()) as { access: string };
      setAccessToken(body.access);
      return body.access;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Запросы к защищённым эндпоинтам: подставляют Authorization-заголовок и
// при 401 (access-токен истёк — живёт 60 минут, см. Frontend/CLAUDE.md)
// один раз пробуют обновить его через /api/token/refresh/ и повторяют
// исходный запрос. Если refresh тоже не удался — отдают исходную 401,
// вызывающий код (см. profile/page.tsx) сам решает редиректить на /login
async function authRequest<T>(path: string, method: AuthMethod, data: unknown, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (data !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  if (res.status === 401 && !isRetry) {
    try {
      await refreshAccessToken();
      return authRequest<T>(path, method, data, true);
    } catch {
      // Не получилось обновить токен — падаем на исходную 401 ниже
    }
  }

  const body = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return authRequest<T>(path, "GET", undefined);
}

export function apiPatch<T>(path: string, data: unknown): Promise<T> {
  return authRequest<T>(path, "PATCH", data);
}

export function apiAuthPost<T>(path: string, data: unknown): Promise<T> {
  return authRequest<T>(path, "POST", data);
}
