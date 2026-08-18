import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { parseApiError } from "./errors";

describe("parseApiError", () => {
  it("returns a generic network message for non-ApiError errors", () => {
    expect(parseApiError(new TypeError("Failed to fetch"))).toEqual({
      fieldErrors: {},
      message: "Не удалось связаться с сервером. Проверьте подключение.",
    });
  });

  it("returns a throttling message for 429, ignoring the body", () => {
    expect(parseApiError(new ApiError(429, { detail: "Request was throttled." }))).toEqual({
      fieldErrors: {},
      message: "Слишком много попыток. Попробуйте позже.",
    });
  });

  it("returns a generic message when the body is missing or not an object", () => {
    expect(parseApiError(new ApiError(500, null))).toEqual({
      fieldErrors: {},
      message: "Что-то пошло не так. Попробуйте ещё раз.",
    });
    expect(parseApiError(new ApiError(500, "oops"))).toEqual({
      fieldErrors: {},
      message: "Что-то пошло не так. Попробуйте ещё раз.",
    });
  });

  it("maps 'detail' to the general message, not a field error", () => {
    const result = parseApiError(new ApiError(401, { detail: "No active account found with the given credentials" }));
    expect(result.message).toBe("No active account found with the given credentials");
    expect(result.fieldErrors).toEqual({});
  });

  it("joins 'non_field_errors' into the general message", () => {
    const result = parseApiError(
      new ApiError(400, { non_field_errors: ["Заказ должен содержать хотя бы один товар или одну услугу."] }),
    );
    expect(result.message).toBe("Заказ должен содержать хотя бы один товар или одну услугу.");
  });

  it("routes every other key into fieldErrors, wrapping single strings as arrays", () => {
    const result = parseApiError(
      new ApiError(400, {
        email: ["Пользователь с таким email уже зарегистрирован."],
        password2: "Пароли не совпадают.",
      }),
    );
    expect(result.fieldErrors).toEqual({
      email: ["Пользователь с таким email уже зарегистрирован."],
      password2: ["Пароли не совпадают."],
    });
    expect(result.message).toBeNull();
  });

  it("can produce both a general message and field errors from the same body", () => {
    const result = parseApiError(
      new ApiError(400, {
        detail: "Ссылка недействительна",
        uidb64: ["Неверная ссылка."],
      }),
    );
    expect(result.message).toBe("Ссылка недействительна");
    expect(result.fieldErrors).toEqual({ uidb64: ["Неверная ссылка."] });
  });
});
