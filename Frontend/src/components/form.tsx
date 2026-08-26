"use client";

import { useState } from "react";

// Общие Tailwind-стили для форм авторизации (login/register/forgot-password/
// reset-password) — вынесены сюда, т.к. используются в 4 местах один в один.
// Токены (cream/charcoal/edge/swamp, отсутствие скругления) — из
// Design website UI_UX/src/index.css, см. Frontend/CLAUDE.md о самом фронтенде.

export const inputClass =
  "w-full border border-edge bg-transparent px-4 py-3 text-sm text-charcoal outline-none transition-colors focus:border-charcoal placeholder:text-stone";

export const buttonClass =
  "flex w-full items-center justify-center bg-charcoal px-4 py-3 text-sm font-semibold text-cream transition-colors hover:bg-swamp disabled:cursor-not-allowed disabled:opacity-50";

// Design's second button variant: outline, inverts to filled charcoal on hover
export const buttonOutlineClass =
  "flex w-full items-center justify-center border border-charcoal px-4 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-cream disabled:cursor-not-allowed disabled:opacity-50";

const labelClass = "text-xs font-semibold uppercase tracking-widest text-stone";

export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  errors,
  autoComplete,
  required = true,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  autoComplete?: string;
  required?: boolean;
  min?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword && revealed ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          min={min}
          className={isPassword ? `${inputClass} pr-11` : inputClass}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-charcoal"
            aria-label={revealed ? "Скрыть пароль" : "Показать пароль"}
          >
            {revealed ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
      {errors?.map((error) => (
        <p key={error} className="text-sm text-cherry">
          {error}
        </p>
      ))}
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  value,
  onChange,
  errors,
  required = true,
  rows = 4,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  required?: boolean;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        rows={rows}
        className={`${inputClass} resize-y`}
      />
      {errors?.map((error) => (
        <p key={error} className="text-sm text-cherry">
          {error}
        </p>
      ))}
    </div>
  );
}

export function FormMessage({ message, tone = "error" }: { message: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return (
    <p
      className={
        tone === "error"
          ? "bg-cherry/10 px-3.5 py-2.5 text-sm text-cherry"
          : "bg-swamp/10 px-3.5 py-2.5 text-sm text-swamp-deep"
      }
    >
      {message}
    </p>
  );
}
