"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiAuthPost, apiPublicGet } from "@/lib/api";
import { cartTotal, clearCart, removeFromCart, setCartItemServices, useCart } from "@/lib/cart";
import { parseApiError } from "@/lib/errors";
import { DELIVERY_FEE, formatPrice } from "@/lib/format";
import { FormField, FormMessage, TextAreaField, buttonClass } from "@/components/form";
import type { FulfillmentType, Order, Paginated, Service } from "@/lib/types";

const FULFILLMENT_OPTIONS: { value: FulfillmentType; label: string }[] = [
  { value: "pickup", label: "Самовывоз" },
  { value: "delivery", label: "Доставка" },
];

export default function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [preorderRequested, setPreorderRequested] = useState(false);
  const [preorderDate, setPreorderDate] = useState("");

  // Услуги, которые можно привязать к конкретному товару в корзине
  // (гравировка, подарочная упаковка...) — берём из каталога (источник
  // истины по цене/названию — Services), а не хардкодим. service_category.kind
  // === "engraving" помечает такие услуги в каталоге (см. Backend/CLAUDE.md,
  // categories.Category.kind)
  const [addonServices, setAddonServices] = useState<Service[]>([]);

  useEffect(() => {
    apiPublicGet<Paginated<Service>>("/api/services/?is_available=true")
      .then((data) => {
        setAddonServices(data.results.filter((service) => service.service_category?.kind === "engraving"));
      })
      .catch(() => {
        // Некритично — просто не покажем блок доп.услуг, сама корзина остаётся рабочей
      });
  }, []);

  // baseItemsTotal — только товары/услуги как отдельные позиции корзины;
  // subtotal (cartTotal) — то же самое ПЛЮС доп.услуги, привязанные к
  // товарам. Единая функция расчёта — lib/cart.ts, не дублируем формулу
  const baseItemsTotal = cart.reduce((sum, item) => sum + Number(item.price), 0);
  const subtotal = cartTotal(cart);
  const deliveryFee = fulfillmentType === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;
  const today = new Date().toISOString().slice(0, 10);

  // Сгруппированная по названию сумма привязанных услуг — для строк вида
  // "Гравировка X XXX ₸" в сводке. Названия берутся из данных, а не
  // хардкодятся, поэтому строка появится для любой новой услуги в каталоге
  const attachedServiceTotals = new Map<string, number>();
  for (const item of cart) {
    for (const service of item.services ?? []) {
      attachedServiceTotals.set(service.name, (attachedServiceTotals.get(service.name) ?? 0) + Number(service.price));
    }
  }

  function toggleItemService(productId: number, service: Service, checked: boolean) {
    const item = cart.find((i) => i.type === "product" && i.id === productId);
    if (!item) return;
    const current = item.services ?? [];
    const next = checked
      ? [...current, { id: service.id, name: service.service_name, price: service.service_price, details: "" }]
      : current.filter((s) => s.id !== service.id);
    setCartItemServices(productId, next);
  }

  function updateItemServiceDetails(productId: number, serviceId: number, details: string) {
    const item = cart.find((i) => i.type === "product" && i.id === productId);
    if (!item) return;
    const next = (item.services ?? []).map((s) => (s.id === serviceId ? { ...s, details } : s));
    setCartItemServices(productId, next);
  }

  async function handleCheckout() {
    setError(null);
    setNeedsLogin(false);

    if (fulfillmentType === "delivery" && !deliveryAddress.trim()) {
      setError("Укажите адрес доставки.");
      return;
    }
    if (preorderRequested && !preorderDate) {
      setError("Укажите желаемую дату получения заказа.");
      return;
    }

    setPending(true);

    try {
      // Каждая привязанная к товару доп.услуга уходит на бэкенд со своим
      // product_id — сервер сам проверит, что товар есть в этом заказе, и
      // сам возьмёт актуальную цену услуги из каталога (не из cart.price)
      const attachedServices = cart
        .filter((item) => item.type === "product")
        .flatMap((item) =>
          (item.services ?? []).map((service) => ({
            product_id: item.id,
            service_id: service.id,
            details: service.details,
          })),
        );

      // ManyToMany на бэкенде — если товар/услуга уже удалены из корзины
      // локально не нужно, просто отправляем текущий набор id
      const order = await apiAuthPost<Order>("/api/orders/", {
        product_ids: cart.filter((item) => item.type === "product").map((item) => item.id),
        service_ids: cart.filter((item) => item.type === "service").map((item) => item.id),
        attached_services: attachedServices,
        fulfillment_type: fulfillmentType,
        delivery_address: fulfillmentType === "delivery" ? deliveryAddress : "",
        preorder_requested: preorderRequested,
        preorder_date: preorderRequested ? preorderDate : null,
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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 py-24 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center bg-blush-soft">
          <svg className="h-7 w-7 text-stone" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
            />
          </svg>
        </div>
        <h1 className="mb-3 text-3xl text-charcoal">Корзина пуста</h1>
        <p className="mb-8 text-sm text-stone">Пока здесь ничего нет — посмотрите каталог товаров.</p>
        <Link href="/products" className="bg-charcoal px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-swamp">
          Смотреть товары
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="mb-10 text-4xl text-charcoal">Корзина</h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {cart.map((item) => (
            <div key={`${item.type}-${item.id}`} className="border-b border-edge pb-6">
              <div className="flex gap-5">
                <div className="h-28 w-24 flex-shrink-0 overflow-hidden bg-blush-soft">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- домен картинок динамический (S3-бакет)
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-stone">Нет фото</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/${item.type === "product" ? "products" : "services"}/${item.id}`} className="text-sm font-semibold text-charcoal hover:underline">
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-stone">{item.type === "product" ? "Товар" : "Услуга"}</p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-bold text-charcoal">{formatPrice(item.price)}</p>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.type, item.id)}
                    className="mt-4 text-xs text-stone transition-colors hover:text-cherry"
                  >
                    Убрать
                  </button>
                </div>
              </div>

              {/* Доп.услуги привязываются к КОНКРЕТНОМУ товару — блок рендерится
                  внутри карточки этого товара, а не как общий чекбокс на корзину,
                  чтобы всегда было однозначно видно, к чему относится услуга */}
              {item.type === "product" && addonServices.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 border-t border-edge pt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone">
                    Доп.услуги для «{item.name}»
                  </p>
                  {addonServices.map((service) => {
                    const attached = item.services?.find((s) => s.id === service.id);
                    const checked = !!attached;
                    return (
                      <div key={service.id} className="flex flex-col gap-2">
                        <label className="flex items-center justify-between gap-3 text-sm text-charcoal">
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleItemService(item.id, service, e.target.checked)}
                              className="h-4 w-4 accent-charcoal"
                            />
                            {service.service_name}
                          </span>
                          <span className="whitespace-nowrap text-stone">{formatPrice(service.service_price)}</span>
                        </label>
                        {checked && (
                          <TextAreaField
                            label={`Комментарий к услуге «${service.service_name}»`}
                            name={`service-${service.id}-details-${item.id}`}
                            value={attached?.details ?? ""}
                            onChange={(value) => updateItemServiceDetails(item.id, service.id, value)}
                            rows={2}
                            required={false}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          <div className="sticky top-24 border border-edge p-6">
            <h2 className="mb-5 text-lg font-semibold text-charcoal">Итого</h2>

            <div className="mb-6 flex flex-col gap-2 border-b border-edge pb-6">
              <div className="flex justify-between text-sm">
                <span className="text-stone">Товары</span>
                <span className="text-charcoal">{formatPrice(String(baseItemsTotal))}</span>
              </div>
              {[...attachedServiceTotals.entries()].map(([name, sum]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span className="text-stone">{name}</span>
                  <span className="text-charcoal">{formatPrice(String(sum))}</span>
                </div>
              ))}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-stone">Доставка</span>
                  <span className="text-charcoal">{formatPrice(String(deliveryFee))}</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-sm font-medium text-charcoal">Итого</span>
                <span className="text-xl font-bold text-charcoal">{formatPrice(String(total))}</span>
              </div>
            </div>

            <fieldset className="mb-6 flex flex-col gap-3 border-b border-edge pb-6">
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-stone">
                Способ получения
              </legend>
              {FULFILLMENT_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-charcoal">
                  <input
                    type="radio"
                    name="fulfillment_type"
                    value={option.value}
                    checked={fulfillmentType === option.value}
                    onChange={() => setFulfillmentType(option.value)}
                    className="h-4 w-4 accent-charcoal"
                  />
                  {option.label}
                </label>
              ))}

              {fulfillmentType === "delivery" && (
                <FormField
                  label="Адрес доставки"
                  name="delivery_address"
                  value={deliveryAddress}
                  onChange={setDeliveryAddress}
                />
              )}
            </fieldset>

            <div className="mb-6 flex flex-col gap-3 border-b border-edge pb-6">
              <label className="flex items-center gap-2 text-sm text-charcoal">
                <input
                  type="checkbox"
                  checked={preorderRequested}
                  onChange={(e) => setPreorderRequested(e.target.checked)}
                  className="h-4 w-4 accent-charcoal"
                />
                Оформить как предзаказ
              </label>

              {preorderRequested && (
                <FormField
                  label="Желаемая дата получения"
                  name="preorder_date"
                  type="date"
                  value={preorderDate}
                  onChange={setPreorderDate}
                  min={today}
                />
              )}
            </div>

            {error && (
              <div className="mb-4">
                <FormMessage message={error} />
              </div>
            )}
            {needsLogin && (
              <p className="mb-4 bg-cherry/10 px-3.5 py-2.5 text-sm text-cherry">
                Войдите, чтобы оформить заказ.{" "}
                <Link href="/login" className="font-medium underline">
                  Войти
                </Link>
              </p>
            )}

            <button onClick={handleCheckout} disabled={pending} className={buttonClass}>
              {pending ? "Оформляем…" : "Оформить заказ"}
            </button>
            <Link href="/products" className="mt-3 block text-center text-sm text-stone underline underline-offset-2 hover:text-charcoal">
              Продолжить покупки
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
