"use client";

import { useState } from "react";
import { apiAuthPost } from "@/lib/api";
import { parseApiError, type FieldErrors } from "@/lib/errors";
import { FormField, FormMessage, buttonClass } from "@/components/form";

export function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFieldErrors({});
    setMessage(null);
    setSuccess(false);

    try {
      await apiAuthPost("/api/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      });
      setSuccess(true);
      setMessage("Пароль изменён.");
      setOldPassword("");
      setNewPassword("");
      setNewPassword2("");
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.fieldErrors);
      setMessage(parsed.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Смена пароля</h2>
      <FormField
        label="Текущий пароль"
        name="old_password"
        type="password"
        value={oldPassword}
        onChange={setOldPassword}
        errors={fieldErrors.old_password}
        autoComplete="current-password"
      />
      <FormField
        label="Новый пароль"
        name="new_password"
        type="password"
        value={newPassword}
        onChange={setNewPassword}
        errors={fieldErrors.new_password}
        autoComplete="new-password"
      />
      <FormField
        label="Повторите новый пароль"
        name="new_password2"
        type="password"
        value={newPassword2}
        onChange={setNewPassword2}
        errors={fieldErrors.new_password2}
        autoComplete="new-password"
      />
      <FormMessage message={message} tone={success ? "success" : "error"} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Сохраняем…" : "Сменить пароль"}
      </button>
    </form>
  );
}
