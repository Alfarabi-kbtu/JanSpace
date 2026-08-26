"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { storeTokens } from "@/lib/auth";
import { parseApiError, type FieldErrors } from "@/lib/errors";
import { FormField, FormMessage, buttonClass } from "@/components/form";
import { AuthShell } from "@/components/auth-shell";

type RegisterResponse = {
  user: { id: number; username: string; email: string };
  access: string;
  refresh: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFieldErrors({});
    setMessage(null);

    try {
      // Бэкенд возвращает access/refresh сразу при регистрации —
      // отдельный запрос на /api/token/ после этого не нужен
      const { access, refresh } = await apiPost<RegisterResponse>("/api/register/", {
        username,
        email,
        password,
        password2,
      });
      storeTokens(access, refresh);
      router.push("/");
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.fieldErrors);
      setMessage(parsed.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="mb-2 text-3xl text-charcoal">Регистрация.</h1>
      <p className="mb-7 text-sm text-stone">Создайте аккаунт JanSpace за минуту.</p>
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
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          errors={fieldErrors.email}
          autoComplete="email"
        />
        <FormField
          label="Пароль"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          errors={fieldErrors.password}
          autoComplete="new-password"
        />
        <FormField
          label="Повторите пароль"
          name="password2"
          type="password"
          value={password2}
          onChange={setPassword2}
          errors={fieldErrors.password2}
          autoComplete="new-password"
        />
        <FormMessage message={message} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Регистрируем…" : "Зарегистрироваться"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-stone">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-medium text-charcoal underline">
          Войти
        </Link>
      </p>
    </AuthShell>
  );
}
