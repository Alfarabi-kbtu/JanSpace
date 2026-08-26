"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { parseApiError, type FieldErrors } from "@/lib/errors";
import { FormField, FormMessage, buttonClass } from "@/components/form";

export function ResetPasswordForm({ uid, token }: { uid: string; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  // uid/token приходят из ссылки в письме (?uid=...&token=...) — без них
  // запрос всё равно упадёт 400 на бэкенде, но лучше сразу сказать пользователю
  if (!uid || !token) {
    return (
      <FormMessage message="Ссылка для сброса пароля повреждена или неполная. Запросите новую." />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFieldErrors({});
    setMessage(null);

    try {
      await apiPost("/api/password-reset/confirm/", {
        uidb64: uid,
        token,
        password,
        password2,
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.fieldErrors);
      setMessage(parsed.message);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return <FormMessage tone="success" message="Пароль изменён. Сейчас перенаправим на вход…" />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField
        label="Новый пароль"
        name="password"
        type="password"
        value={password}
        onChange={setPassword}
        errors={fieldErrors.password}
        autoComplete="new-password"
      />
      <FormField
        label="Повторите новый пароль"
        name="password2"
        type="password"
        value={password2}
        onChange={setPassword2}
        errors={fieldErrors.password2}
        autoComplete="new-password"
      />
      {fieldErrors.uidb64 || fieldErrors.token ? (
        <FormMessage message="Ссылка недействительна или уже использована. Запросите новую." />
      ) : (
        <FormMessage message={message} />
      )}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Сохраняем…" : "Сохранить новый пароль"}
      </button>
      <p className="text-sm text-stone">
        <Link href="/forgot-password" className="font-medium text-charcoal hover:underline">
          Запросить новую ссылку
        </Link>
      </p>
    </form>
  );
}
