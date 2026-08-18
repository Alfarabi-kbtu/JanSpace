"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { parseApiError, type FieldErrors } from "@/lib/errors";
import { FormField, FormMessage, buttonClass } from "@/components/form";
import { ChangePasswordForm } from "./change-password-form";

type Profile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    apiGet<Profile>("/api/profile/")
      .then((data) => {
        setUsername(data.username);
        setEmail(data.email);
        setFirstName(data.first_name);
        setLastName(data.last_name);
      })
      .catch((err) => {
        // apiGet сам пробует обновить access-токен через refresh при 401 —
        // если и это не помогло, сессия истекла полностью, ведём на логин
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        } else {
          setMessage("Не удалось загрузить профиль.");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFieldErrors({});
    setMessage(null);
    setSuccess(false);

    try {
      const updated = await apiPatch<Profile>("/api/profile/", {
        email,
        first_name: firstName,
        last_name: lastName,
      });
      setEmail(updated.email);
      setFirstName(updated.first_name);
      setLastName(updated.last_name);
      setSuccess(true);
      setMessage("Профиль обновлён.");
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.fieldErrors);
      setMessage(parsed.message ?? "Не удалось сохранить изменения.");
    } finally {
      setPending(false);
    }
  }

  if (loading || username === null) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-10 px-6 py-16">
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Профиль</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Логин</span>
            {/* username сменить нельзя — read-only на бэкенде (см. Frontend/CLAUDE.md) */}
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{username}</p>
          </div>
          <FormField label="Email" name="email" type="email" value={email} onChange={setEmail} errors={fieldErrors.email} autoComplete="email" />
          <FormField label="Имя" name="first_name" value={firstName} onChange={setFirstName} errors={fieldErrors.first_name} required={false} />
          <FormField label="Фамилия" name="last_name" value={lastName} onChange={setLastName} errors={fieldErrors.last_name} required={false} />
          <FormMessage message={message} tone={success ? "success" : "error"} />
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Сохраняем…" : "Сохранить"}
          </button>
        </form>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
