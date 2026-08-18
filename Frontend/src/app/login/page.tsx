"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { storeTokens } from "@/lib/auth";
import { parseApiError, type FieldErrors } from "@/lib/errors";
import { FormField, FormMessage, buttonClass } from "@/components/form";

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
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Вход</h1>
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
        <FormMessage message={message} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Входим…" : "Войти"}
        </button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/forgot-password" className="hover:text-zinc-900 dark:hover:text-zinc-50">
          Забыли пароль?
        </Link>
        <p>
          Нет аккаунта?{" "}
          <Link href="/register" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
