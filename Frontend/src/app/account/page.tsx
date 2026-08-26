"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { formatDate, orderStatusColorClass, orderStatusLabel, orderTotal } from "@/lib/format";
import type { Order, Paginated } from "@/lib/types";
import { AccountLayout } from "@/components/account-layout";

type Profile = { username: string; email: string };

// Только реальные данные — счётчики берём из count пагинации, без выдуманных
// метрик вроде "баллов лояльности" из Design website UI_UX/src/pages/AccountPage.tsx
export default function AccountOverviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Paginated<Order> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    Promise.all([apiGet<Profile>("/api/profile/"), apiGet<Paginated<Order>>("/api/orders/?page=1")])
      .then(([profileData, ordersData]) => {
        setProfile(profileData);
        setOrders(ordersData);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        } else {
          setError("Не удалось загрузить данные аккаунта.");
        }
      });
  }, [router]);

  if (error) {
    return (
      <AccountLayout>
        <p className="text-cherry">{error}</p>
      </AccountLayout>
    );
  }

  if (!profile || !orders) {
    return <AccountLayout>{null}</AccountLayout>;
  }

  const activeOrders = orders.results.filter((o) => o.order_status === "pending" || o.order_status === "processing").length;

  return (
    <AccountLayout>
      <div className="flex flex-col gap-10">
        <div>
          <h1 className="mb-1 text-3xl text-charcoal">Здравствуйте, {profile.username}</h1>
          <p className="text-sm text-stone">{profile.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="border border-edge p-5">
            <p className="text-3xl font-bold text-charcoal">{orders.count}</p>
            <p className="text-sm text-stone">Всего заказов</p>
          </div>
          <div className="border border-edge p-5">
            <p className="text-3xl font-bold text-charcoal">{activeOrders}</p>
            <p className="text-sm text-stone">В обработке</p>
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">Последние заказы</h2>
            <Link href="/orders" className="text-sm text-charcoal underline underline-offset-4 hover:text-coral">
              Все заказы
            </Link>
          </div>
          {orders.results.length === 0 ? (
            <p className="text-sm text-stone">Заказов пока нет.</p>
          ) : (
            <div className="flex flex-col divide-y divide-edge border-t border-edge">
              {orders.results.slice(0, 3).map((order) => (
                <Link
                  key={order.order_id}
                  href={`/orders/${order.order_id}`}
                  className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-blush-soft/40"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-charcoal">Заказ от {formatDate(order.order_date)}</span>
                    <span className={`w-fit px-2 py-0.5 text-xs font-medium ${orderStatusColorClass(order.order_status)}`}>
                      {orderStatusLabel(order.order_status)}
                    </span>
                  </div>
                  <span className="font-medium text-charcoal">{orderTotal(order).toLocaleString("ru-RU")} ₸</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
