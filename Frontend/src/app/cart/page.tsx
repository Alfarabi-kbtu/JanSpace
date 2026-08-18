"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiAuthPost, ApiError } from "@/lib/api";
import { clearCart, removeFromCart, useCart } from "@/lib/cart";
import { parseApiError } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import { FormMessage, buttonClass } from "@/components/form";
import type { Order } from "@/lib/types";

export default function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const total = cart.reduce((sum, item) => sum + Number(item.price), 0);

  async function handleCheckout() {
    setPending(true);
    setError(null);
    setNeedsLogin(false);

    try {
      // ManyToMany на бэкенде — если товар/услуга уже удалены из корзины
      // локально не нужно, просто отправляем текущий набор id
      const order = await apiAuthPost<Order>("/api/orders/", {
        product_ids: cart.filter((item) => item.type === "product").map((item) => item.id),
        service_ids: cart.filter((item) => item.type === "service").map((item) => item.id),
      });
      clearCart();
      router.push(`/orders/${order.order_id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setNeedsLogin(true);
      } else {
        setError(parseApiError(err).message ?? "Не удалось оформить заказ.");
      }
    } finally {
      setPending(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Корзина</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Корзина пуста.</p>
        <Link href="/products" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
          Смотреть товары
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Корзина</h1>

      <div className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.145]">
        {cart.map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 py-4">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- домен картинок динамический (S3-бакет)
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-600">
                  Нет фото
                </div>
              )}
            </div>
            <Link
              href={`/${item.type === "product" ? "products" : "services"}/${item.id}`}
              className="flex-1 font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              {item.name}
            </Link>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">{formatPrice(item.price)}</span>
            <button
              onClick={() => removeFromCart(item.type, item.id)}
              className="text-sm text-zinc-500 transition-colors hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
            >
              Убрать
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-black/[.08] pt-4 dark:border-white/[.145]">
        <span className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Итого</span>
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{formatPrice(String(total))}</span>
      </div>

      <FormMessage message={error} />
      {needsLogin && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Войдите, чтобы оформить заказ.{" "}
          <Link href="/login" className="font-medium underline">
            Войти
          </Link>
        </p>
      )}

      <button onClick={handleCheckout} disabled={pending} className={buttonClass}>
        {pending ? "Оформляем…" : "Оформить заказ"}
      </button>
    </div>
  );
}
