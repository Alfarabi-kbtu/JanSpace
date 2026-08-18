"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { formatDate, formatPrice, orderStatusColorClass, orderStatusLabel, orderTotal } from "@/lib/format";
import { useOrderStatusUpdates } from "@/lib/order-status";
import type { Order, Paginated } from "@/lib/types";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Paginated<Order> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- настоящий fetch-эффект, сбрасываем стейт синхронно перед новым запросом
    setLoading(true);
    setError(null);

    apiGet<Paginated<Order>>(`/api/orders/?page=${page}`)
      .then(setOrders)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        } else {
          setError("Не удалось загрузить заказы.");
        }
      })
      .finally(() => setLoading(false));
  }, [page, router]);

  useOrderStatusUpdates((event) => {
    setOrders((current) => {
      if (!current) return current;
      return {
        ...current,
        results: current.results.map((order) =>
          order.order_id === event.order_id ? { ...order, order_status: event.order_status } : order,
        ),
      };
    });
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Мои заказы</h1>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {!error && loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">Загрузка…</p>}

      {!error && !loading && orders?.results.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Заказов пока нет.</p>
      )}

      {!error && !loading && orders && orders.results.length > 0 && (
        <div className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.145]">
          {orders.results.map((order) => (
            <Link
              key={order.order_id}
              href={`/orders/${order.order_id}`}
              className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.03]"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  Заказ от {formatDate(order.order_date)}
                </span>
                <span
                  className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${orderStatusColorClass(order.order_status)}`}
                >
                  {orderStatusLabel(order.order_status)}
                </span>
              </div>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{formatPrice(String(orderTotal(order)))}</span>
            </Link>
          ))}
        </div>
      )}

      {!error && !loading && orders && (orders.next || orders.previous) && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!orders.previous}
            className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.03] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
          >
            Назад
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Страница {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!orders.next}
            className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.03] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
