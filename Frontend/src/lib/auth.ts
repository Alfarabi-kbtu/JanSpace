// Access-токен живёт 60 минут, refresh — 7 дней (см. Frontend/CLAUDE.md).
// Здесь только хранение токенов — сам refresh-flow (401 -> /api/token/refresh/)
// понадобится, когда появятся защищённые страницы/запросы
const ACCESS_KEY = "janspace_access_token";
const REFRESH_KEY = "janspace_refresh_token";

// localStorage не эмитит событий в той же вкладке, где меняется — своё
// событие нужно, чтобы компоненты вроде Header могли реагировать на
// логин/логаут без перезагрузки страницы (см. useSyncExternalStore в Header)
export const AUTH_CHANGE_EVENT = "janspace-auth-change";

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  notifyAuthChange();
}

// Обновляет только access-токен (после /api/token/refresh/) — refresh-токен
// не ротируется бэкендом, поэтому его трогать не нужно. Не дёргает
// notifyAuthChange: статус "залогинен/нет" при этом не меняется
export function setAccessToken(access: string) {
  localStorage.setItem(ACCESS_KEY, access);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  notifyAuthChange();
}
