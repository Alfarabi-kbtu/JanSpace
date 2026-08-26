"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiAuthPost, apiGet, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { parseApiError, type FieldErrors } from "@/lib/errors";
import type { Complaint, Paginated } from "@/lib/types";
import { FormField, FormMessage, TextAreaField, buttonClass } from "@/components/form";
import { AccountLayout } from "@/components/account-layout";

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
      setMessage("Сообщение отправлено.");
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
    <AccountLayout>
      <div className="flex flex-col gap-12">
        <div className="max-w-sm">
          <h1 className="mb-2 text-3xl text-charcoal">Поддержка</h1>
          <p className="mb-7 text-sm text-stone">Опишите проблему — ответим на указанный email.</p>
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
              label="Сообщение"
              name="complaint_text"
              value={complaintText}
              onChange={setComplaintText}
              errors={fieldErrors.complaint_text}
            />
            <FormMessage message={message} tone={message === "Сообщение отправлено." ? "success" : "error"} />
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? "Отправляем…" : "Отправить"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-charcoal">История обращений</h2>

          {listError && <p className="bg-cherry/10 px-3.5 py-2.5 text-sm text-cherry">{listError}</p>}

          {!listError && loading && <p className="text-sm text-stone">Загрузка…</p>}

          {!listError && !loading && complaints?.results.length === 0 && (
            <p className="text-sm text-stone">Обращений пока нет.</p>
          )}

          {!listError && !loading && complaints && complaints.results.length > 0 && (
            <div className="flex flex-col divide-y divide-edge border-t border-edge">
              {complaints.results.map((complaint) => (
                <div key={complaint.id} className="flex flex-col gap-1 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-charcoal">{complaint.complaint_address}</span>
                    <span className="text-xs text-stone">{formatDate(complaint.created_at)}</span>
                  </div>
                  <p className="text-sm text-stone">{complaint.complaint_text}</p>
                </div>
              ))}
            </div>
          )}

          {!listError && !loading && complaints && (complaints.next || complaints.previous) && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!complaints.previous}
                className="border border-charcoal px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal hover:text-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-charcoal"
              >
                Назад
              </button>
              <span className="text-sm text-stone">Страница {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!complaints.next}
                className="border border-charcoal px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal hover:text-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-charcoal"
              >
                Вперёд
              </button>
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
