"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ApiError, apiPublicGet } from "@/lib/api";
import type { Paginated, Service } from "@/lib/types";
import { DetailView } from "@/components/detail-view";
import { CartButton } from "@/components/cart-button";
import type { CatalogItem } from "@/components/catalog-grid";

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [related, setRelated] = useState<CatalogItem[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Настоящий fetch-эффект (не зеркалирование пропсов в стейт) — при смене
    // id намеренно сбрасываем notFound/error синхронно, чтобы не показывать
    // состояние предыдущей услуги, пока грузится новая
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotFound(false);
    setError(null);
    setRelated([]);

    apiPublicGet<Service>(`/api/services/${id}/`)
      .then((data) => {
        setService(data);
        if (data.service_category) {
          apiPublicGet<Paginated<Service>>(`/api/services/?service_category=${data.service_category.id}`)
            .then((page) =>
              setRelated(
                page.results
                  .filter((s) => s.id !== data.id)
                  .slice(0, 4)
                  .map((s) => ({
                    id: s.id,
                    name: s.service_name,
                    price: s.service_price,
                    category: s.service_category,
                    is_available: s.is_available,
                    image: s.image,
                  })),
              ),
            )
            .catch(() => {
              // Похожие услуги необязательны для страницы услуги
            });
        }
      })
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
        <p className="text-stone">Услуга не найдена.</p>
        <Link href="/services" className="font-medium text-charcoal hover:underline">
          ← Все услуги
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="text-cherry">{error}</p>
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
      crossSell={{
        message: "Нужен товар к этой услуге?",
        ctaLabel: "Смотреть товары",
        href: "/products",
      }}
      related={related}
      relatedHrefBase="/services"
      relatedCategoryLabel={(category) => category.service_category ?? ""}
    />
  );
}
