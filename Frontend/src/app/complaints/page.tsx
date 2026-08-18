"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiAuthPost, apiGet, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { parseApiError, type FieldErrors } from "@/lib/errors";
import type { Complaint, Paginated } from "@/lib/types";
import { FormField, FormMessage, TextAreaField, buttonClass } from "@/components/form";

export default function ComplaintsPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Paginated<Complaint> | null>(null);
  const [page, setPage] = useState(1);
  // Растёт на каждую успешную отправку — заставляет эффект ниже перезапросить
  // список даже если page не поменялся (например, отправили жалобу на 1-й странице)
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [complaintAddress, setComplaintAddress] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- настоящий fetch-эффект, сбрасываем стейт синхронно перед новым запросом
    setLoading(true);
    setListError(null);

    apiGet<Paginated<Complaint>>(`/api/complaints/?page=${page}`)
      .then(setComplaints)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        } else {
          setListError("Не удалось загрузить жалобы.");
        }
      })
      .finally(() => setLoading(false));
  }, [page, reloadKey, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFieldErrors({});
    setMessage(null);

    try {
      await apiAuthPost<Complaint>("/api/complaints/", {
        complaint_address: complaintAddress,
        complaint_text: complaintText,
      });
      setComplaintAddress("");
      setComplaintText("");
      // Новая жалоба всегда попадает на 1-ю страницу (ordering = "-created_at")
      setPage(1);
      setReloadKey((key) => key + 1);
    } catch (err) {
      const parsed = parseApiError(err);
      setFieldErrors(parsed.fieldErrors);
      setMessage(parsed.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Оставить жалобу
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label="Email для ответа"
            name="complaint_address"
            type="email"
            value={complaintAddress}
            onChange={setComplaintAddress}
            errors={fieldErrors.complaint_address}
            autoComplete="email"
          />
          <TextAreaField
            label="Текст жалобы"
            name="complaint_text"
            value={complaintText}
            onChange={setComplaintText}
            errors={fieldErrors.complaint_text}
          />
          <FormMessage message={message} />
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Отправляем…" : "Отправить"}
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Мои жалобы</h2>

        {listError && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {listError}
          </p>
        )}

        {!listError && loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">Загрузка…</p>}

        {!listError && !loading && complaints?.results.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Жалоб пока нет.</p>
        )}

        {!listError && !loading && complaints && complaints.results.length > 0 && (
          <div className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.145]">
            {complaints.results.map((complaint) => (
              <div key={complaint.id} className="flex flex-col gap-1 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {complaint.complaint_address}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(complaint.created_at)}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{complaint.complaint_text}</p>
              </div>
            ))}
          </div>
        )}

        {!listError && !loading && complaints && (complaints.next || complaints.previous) && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!complaints.previous}
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.03] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
            >
              Назад
            </button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Страница {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!complaints.next}
              className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.03] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
