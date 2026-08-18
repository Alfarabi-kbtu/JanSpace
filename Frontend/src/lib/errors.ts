import { ApiError } from "./api";

export type FieldErrors = Record<string, string[]>;

export type ParsedError = {
  fieldErrors: FieldErrors;
  message: string | null;
};

// Разбирает ответ DRF на "ошибки по конкретным полям" (username, password, ...)
// и "общее сообщение" (detail / non_field_errors), чтобы форма могла показать
// их в нужных местах. 429 — троттлинг бэкенда, это ожидаемое поведение
// (см. Frontend/CLAUDE.md), а не баг — показываем понятное сообщение,
// не пытаемся automatически повторить запрос
export function parseApiError(err: unknown): ParsedError {
  if (!(err instanceof ApiError)) {
    return { fieldErrors: {}, message: "Не удалось связаться с сервером. Проверьте подключение." };
  }

  if (err.status === 429) {
    return { fieldErrors: {}, message: "Слишком много попыток. Попробуйте позже." };
  }

  const body = err.body;
  if (!body || typeof body !== "object") {
    return { fieldErrors: {}, message: "Что-то пошло не так. Попробуйте ещё раз." };
  }

  const data = body as Record<string, unknown>;
  const fieldErrors: FieldErrors = {};
  let message: string | null = null;

  for (const [key, value] of Object.entries(data)) {
    const messages = Array.isArray(value) ? value.map(String) : [String(value)];

    if (key === "detail" || key === "non_field_errors") {
      message = messages.join(" ");
    } else {
      fieldErrors[key] = messages;
    }
  }

  return { fieldErrors, message };
}
