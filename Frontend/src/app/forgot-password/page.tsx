"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { parseApiError, type FieldErrors } from "@/lib/errors";
import { FormField, FormMessage, buttonClass } from "@/components/form";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFieldErrors({});
    setMessage(null);

    try {
      // Ответ бэкенда всегда 200 и одинаковый текст, есть такой email или
      // нет — это защита от перебора почт, не полагаемся на тело ответа
      await apiPost("/api/password-reset/", { email });
      setSent(true);
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.fieldErrors);
      setMessage(parsed.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-3xl text-charcoal">Восстановление пароля</h1>
      <p className="mb-7 text-sm text-stone">
        Укажите email, привязанный к аккаунту — если он зарегистрирован, на него придёт ссылка для сброса пароля.
      </p>

      {sent ? (
        <FormMessage
          tone="success"
          message="Если такой email зарегистрирован, письмо со ссылкой для сброса пароля отправлено."
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            errors={fieldErrors.email}
            autoComplete="email"
          />
          <FormMessage message={message} />
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Отправляем…" : "Отправить ссылку"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-stone">
        <Link href="/login" className="font-medium text-charcoal hover:underline">
          Вернуться ко входу
        </Link>
      </p>
    </div>
  );
}
