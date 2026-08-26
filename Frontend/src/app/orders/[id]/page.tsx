"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { DELIVERY_FEE, formatDate, formatDateOnly, formatPrice, fulfillmentTypeLabel, orderTotal } from "@/lib/format";
import { useOrderStatusUpdates } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { AccountLayout } from "@/components/account-layout";
import { OrderStatusTracker } from "@/components/order-status-tracker";

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
      <AccountLayout>
        <div className="flex flex-col items-start gap-4">
          <p className="text-stone">Заказ не найден.</p>
          <Link href="/orders" className="font-medium text-charcoal hover:underline">
            ← Мои заказы
          </Link>
        </div>
      </AccountLayout>
    );
  }

  if (error) {
    return (
      <AccountLayout>
        <p className="text-cherry">{error}</p>
      </AccountLayout>
    );
  }

  if (!order) {
    return <AccountLayout>{null}</AccountLayout>;
  }

  // Товары — с привязанными к ним доп.услугами (гравировка и т.п.), чтобы
  // было видно, к какому именно товару относится каждая. Услуги-позиции
  // (order.services) — самостоятельные записи заказа, ни к одному товару
  // не привязаны, показываем отдельным списком ниже
  const productItems = order.product.map((p) => ({
    id: `product-${p.id}`,
    name: p.product_name,
    price: p.price,
    attachedServices: order.service_items.filter((item) => item.product === p.id),
  }));
  const standaloneServiceItems = order.services.map((s) => ({ id: `service-${s.id}`, name: s.service_name, price: s.service_price }));

  return (
    <AccountLayout>
      <div className="flex flex-col gap-8">
        <Link href="/orders" className="text-sm text-stone transition-colors hover:text-coral">
          ← Мои заказы
        </Link>

        <div>
          <h1 className="mb-6 text-3xl text-charcoal">Заказ от {formatDate(order.order_date)}</h1>
          <OrderStatusTracker status={order.order_status} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="border border-edge p-5">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-stone">
              {fulfillmentTypeLabel(order.fulfillment_type)}
            </p>
            {order.fulfillment_type === "delivery" && <p className="text-charcoal">{order.delivery_address}</p>}
          </div>

          {order.preorder_requested && order.preorder_date && (
            <div className="border border-edge p-5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-stone">Предзаказ</p>
              <p className="text-charcoal">{formatDateOnly(order.preorder_date)}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col divide-y divide-edge border-t border-edge">
          {productItems.map((item) => (
            <div key={item.id} className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-charcoal">{item.name}</span>
                <span className="font-medium text-charcoal">{formatPrice(item.price)}</span>
              </div>
              {/* Доп.услуги показаны прямо под своим товаром, а не общим
                  списком — чтобы было однозначно видно, к чему они относятся */}
              {item.attachedServices.map((service) => (
                <div key={service.id} className="mt-1.5 flex items-center justify-between pl-4 text-sm text-stone">
                  <span>
                    {service.service_name}
                    {service.details ? ` — ${service.details}` : ""}
                  </span>
                  <span>{formatPrice(service.price_snapshot)}</span>
                </div>
              ))}
            </div>
          ))}
          {standaloneServiceItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3">
              <span className="text-charcoal">{item.name}</span>
              <span className="font-medium text-charcoal">{formatPrice(item.price)}</span>
            </div>
          ))}
          {order.fulfillment_type === "delivery" && (
            <div className="flex items-center justify-between py-3">
              <span className="text-charcoal">Доставка</span>
              <span className="font-medium text-charcoal">{formatPrice(String(DELIVERY_FEE))}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-edge pt-4">
          <span className="text-lg font-medium text-charcoal">Итого</span>
          <span className="text-xl font-bold text-charcoal">{formatPrice(String(orderTotal(order)))}</span>
        </div>
      </div>
    </AccountLayout>
  );
}
