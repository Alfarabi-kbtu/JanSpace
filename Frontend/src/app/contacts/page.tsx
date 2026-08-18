"use client";

import { useEffect, useState } from "react";
import { apiPublicGet } from "@/lib/api";
import type { Messenger, Paginated } from "@/lib/types";

const LINK_LABELS: { key: keyof Omit<Messenger, "id">; label: string }[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "telegram", label: "Telegram" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
];

export default function ContactsPage() {
  const [messenger, setMessenger] = useState<Messenger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiPublicGet<Paginated<Messenger>>("/api/messengers/")
      .then((data) => setMessenger(data.results[0] ?? null))
      .catch(() => setError("Не удалось загрузить контакты."))
      .finally(() => setLoading(false));
  }, []);

  const links = messenger
    ? LINK_LABELS.flatMap(({ key, label }) => {
        const url = messenger[key];
        return url ? [{ key, label, url }] : [];
      })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Контакты</h1>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {!error && loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">Загрузка…</p>}

      {!error && !loading && links.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Контакты пока не добавлены.</p>
      )}

      {!error && !loading && links.length > 0 && (
        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-black/[.08] px-5 py-4 text-zinc-900 transition-colors hover:bg-black/[.03] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-white/[.06]"
            >
              <span className="font-medium">{link.label}</span>
              <span className="text-zinc-400 dark:text-zinc-600">→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
