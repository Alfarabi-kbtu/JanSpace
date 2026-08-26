import type { FulfillmentType, Order, OrderStatus } from "./types";

export function formatPrice(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return `${amount.toLocaleString("ru-RU")} ₸`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Ожидает обработки",
  processing: "В обработке",
  completed: "Выполнен",
  cancelled: "Отменён",
};

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-edge/60 text-charcoal",
  processing: "bg-sky/40 text-charcoal",
  completed: "bg-swamp/10 text-swamp-deep",
  cancelled: "bg-cherry/10 text-cherry",
};

export function orderStatusColorClass(status: OrderStatus): string {
  return ORDER_STATUS_COLORS[status] ?? ORDER_STATUS_COLORS.pending;
}

// preorder_date с бэкенда — DateField без времени ("YYYY-MM-DD"). new Date(str)
// парсит такую строку как UTC-полночь, из-за чего toLocaleString в часовых
// поясах западнее UTC мог бы показать предыдущий день — собираем дату из
// частей строки, чтобы всегда получить локальную полночь этого же числа
export function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  pickup: "Самовывоз",
  delivery: "Доставка",
};

export function fulfillmentTypeLabel(type: FulfillmentType): string {
  return FULFILLMENT_TYPE_LABELS[type] ?? type;
}

// Самовывоз бесплатен, доставка — платная фиксированная надбавка сверх
// стоимости товаров/услуг (соответствует цене услуги "Home delivery" в
// каталоге, см. Backend/CLAUDE.md)
export const DELIVERY_FEE = 4990;

export function orderTotal(order: Order): number {
  const productsTotal = order.product.reduce((sum, p) => sum + Number(p.price), 0);
  const servicesTotal = order.services.reduce((sum, s) => sum + Number(s.service_price), 0);
  // Доп.услуги, привязанные к конкретным товарам заказа (гравировка и
  // т.п.) — цена берётся из price_snapshot (зафиксирована при оформлении),
  // а не из текущей цены услуги в каталоге
  const attachedServicesTotal = order.service_items.reduce((sum, item) => sum + Number(item.price_snapshot), 0);
  const deliveryFee = order.fulfillment_type === "delivery" ? DELIVERY_FEE : 0;
  return productsTotal + servicesTotal + attachedServicesTotal + deliveryFee;
}
