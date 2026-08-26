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

// На мобильных пытаемся открыть нативное приложение Instagram, а если оно
// не установлено (страница остаётся видимой дольше 2с), уводим на веб-версию
function openInstagramApp(event: React.MouseEvent<HTMLAnchorElement>, webUrl: string) {
  const username = webUrl.match(/instagram\.com\/([^/?#]+)/i)?.[1];
  if (!username) return;

  event.preventDefault();
  const start = Date.now();
  window.location.href = `instagram://user?username=${username}`;

  setTimeout(() => {
    if (Date.now() - start < 2000) {
      window.location.href = webUrl;
    }
  }, 1500);
}

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
      <h1 className="text-3xl text-charcoal">Контакты</h1>

      {error && <p className="bg-cherry/10 px-3.5 py-2.5 text-sm text-cherry">{error}</p>}

      {!error && loading && <p className="text-sm text-stone">Загрузка…</p>}

      {!error && !loading && links.length === 0 && <p className="text-sm text-stone">Контакты пока не добавлены.</p>}

      {!error && !loading && links.length > 0 && (
        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={link.key === "instagram" ? (e) => openInstagramApp(e, link.url) : undefined}
              className="flex items-center justify-between border border-edge px-5 py-4 text-charcoal transition-colors hover:bg-blush-soft/40"
            >
              <span className="font-medium">{link.label}</span>
              <span className="text-stone">→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
