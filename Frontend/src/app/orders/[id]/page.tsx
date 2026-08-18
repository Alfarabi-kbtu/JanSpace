"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { formatDate, formatPrice, orderStatusColorClass, orderStatusLabel, orderTotal } from "@/lib/format";
import { useOrderStatusUpdates } from "@/lib/order-status";
import type { Order } from "@/lib/types";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- настоящий fetch-эффект, сбрасываем стейт синхронно перед новым запросом
    setNotFound(false);
    setError(null);

    apiGet<Order>(`/api/orders/${id}/`)
      .then(setOrder)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        } else if (err instanceof ApiError && err.status === 404) {
          // Бэкенд отдаёт 404 и для чужого заказа (queryset уже отфильтрован
          // по текущему юзеру, см. Frontend/CLAUDE.md) — не только для
          // несуществующего order_id
          setNotFound(true);
        } else {
          setError("Не удалось загрузить заказ.");
        }
      });
  }, [id, router]);

  useOrderStatusUpdates((event) => {
    if (event.order_id !== id) return;
    setOrder((current) => (current ? { ...current, order_status: event.order_status } : current));
  });

  if (notFound) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="text-zinc-600 dark:text-zinc-400">Заказ не найден.</p>
        <Link href="/orders" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
          ← Мои заказы
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const items = [
    ...order.product.map((p) => ({ id: `product-${p.id}`, name: p.product_name, price: p.price })),
    ...order.services.map((s) => ({ id: `service-${s.id}`, name: s.service_name, price: s.service_price })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <Link
        href="/orders"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Мои заказы
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Заказ от {formatDate(order.order_date)}
        </h1>
        <span className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${orderStatusColorClass(order.order_status)}`}>
          {orderStatusLabel(order.order_status)}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.145]">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-3">
            <span className="text-zinc-900 dark:text-zinc-50">{item.name}</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{formatPrice(item.price)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-black/[.08] pt-4 dark:border-white/[.145]">
        <span className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Итого</span>
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {formatPrice(String(orderTotal(order)))}
        </span>
      </div>
    </div>
  );
}
