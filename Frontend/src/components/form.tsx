// Общие Tailwind-стили для форм авторизации (login/register/forgot-password/
// reset-password) — вынесены сюда, т.к. используются в 4 местах один в один.

export const inputClass =
  "w-full rounded-lg border border-black/[.08] bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500";

export const buttonClass =
  "flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";

export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  errors,
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className={inputClass}
      />
      {errors?.map((error) => (
        <p key={error} className="text-sm text-red-600 dark:text-red-400">
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
      <label htmlFor={name} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
        <p key={error} className="text-sm text-red-600 dark:text-red-400">
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
          ? "rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          : "rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      }
    >
      {message}
    </p>
  );
}
