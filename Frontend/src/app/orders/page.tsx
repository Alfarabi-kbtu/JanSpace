"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { formatDate, formatPrice, orderStatusColorClass, orderStatusLabel, orderTotal } from "@/lib/format";
import { useOrderStatusUpdates } from "@/lib/order-status";
import type { Order, Paginated } from "@/lib/types";
import { AccountLayout } from "@/components/account-layout";

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
    <AccountLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl text-charcoal">Мои заказы</h1>

        {error && <p className="bg-cherry/10 px-3.5 py-2.5 text-sm text-cherry">{error}</p>}

        {!error && loading && <p className="text-sm text-stone">Загрузка…</p>}

        {!error && !loading && orders?.results.length === 0 && <p className="text-sm text-stone">Заказов пока нет.</p>}

        {!error && !loading && orders && orders.results.length > 0 && (
          <div className="flex flex-col divide-y divide-edge border-t border-edge">
            {orders.results.map((order) => (
              <Link
                key={order.order_id}
                href={`/orders/${order.order_id}`}
                className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-blush-soft/40"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-charcoal">Заказ от {formatDate(order.order_date)}</span>
                  <span className={`w-fit px-2 py-0.5 text-xs font-medium ${orderStatusColorClass(order.order_status)}`}>
                    {orderStatusLabel(order.order_status)}
                  </span>
                </div>
                <span className="font-medium text-charcoal">{formatPrice(String(orderTotal(order)))}</span>
              </Link>
            ))}
          </div>
        )}

        {!error && !loading && orders && (orders.next || orders.previous) && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!orders.previous}
              className="border border-charcoal px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal hover:text-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-charcoal"
            >
              Назад
            </button>
            <span className="text-sm text-stone">Страница {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!orders.next}
              className="border border-charcoal px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal hover:text-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-charcoal"
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
