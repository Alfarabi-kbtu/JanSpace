"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ApiError, apiPublicGet } from "@/lib/api";
import type { Service } from "@/lib/types";
import { DetailView } from "@/components/detail-view";
import { CartButton } from "@/components/cart-button";

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Настоящий fetch-эффект (не зеркалирование пропсов в стейт) — при смене
    // id намеренно сбрасываем notFound/error синхронно, чтобы не показывать
    // состояние предыдущей услуги, пока грузится новая
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotFound(false);
    setError(null);

    apiPublicGet<Service>(`/api/services/${id}/`)
      .then(setService)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError("Не удалось загрузить услугу.");
        }
      });
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="text-zinc-600 dark:text-zinc-400">Услуга не найдена.</p>
        <Link href="/services" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
          ← Все услуги
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!service) {
    return null;
  }

  return (
    <DetailView
      name={service.service_name}
      price={service.service_price}
      category={service.service_category}
      categoryLabel={(category) => category.service_category ?? ""}
      is_available={service.is_available}
      image={service.image}
      backHref="/services"
      backLabel="Все услуги"
      actions={
        <CartButton
          type="service"
          id={service.id}
          name={service.service_name}
          price={service.service_price}
          image={service.image}
          disabled={!service.is_available}
        />
      }
    />
  );
}
