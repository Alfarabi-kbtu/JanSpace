"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { storeTokens } from "@/lib/auth";
import { parseApiError, type FieldErrors } from "@/lib/errors";
import { FormField, FormMessage, buttonClass } from "@/components/form";
import { AuthShell } from "@/components/auth-shell";

type TokenResponse = { access: string; refresh: string };

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFieldErrors({});
    setMessage(null);

    try {
      const { access, refresh } = await apiPost<TokenResponse>("/api/token/", { username, password });
      storeTokens(access, refresh);
      router.push("/");
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.fieldErrors);
      // DRF отдаёт неверный логин/пароль как detail — на форме логина это
      // общая ошибка формы, а не ошибка конкретного поля
      setMessage(parsed.message ?? "Не удалось войти. Проверьте логин и пароль.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="mb-2 text-3xl text-charcoal">С возвращением.</h1>
      <p className="mb-7 text-sm text-stone">Войдите в свой аккаунт JanSpace.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Логин"
          name="username"
          value={username}
          onChange={setUsername}
          errors={fieldErrors.username}
          autoComplete="username"
        />
        <FormField
          label="Пароль"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          errors={fieldErrors.password}
          autoComplete="current-password"
        />
        <Link href="/forgot-password" className="-mt-2 text-xs text-stone hover:text-charcoal">
          Забыли пароль?
        </Link>
        <FormMessage message={message} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Входим…" : "Войти"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-stone">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-medium text-charcoal underline">
          Зарегистрироваться
        </Link>
      </p>
    </AuthShell>
  );
}
