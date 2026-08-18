import type { Order, OrderStatus } from "./types";

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
  pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  processing: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export function orderStatusColorClass(status: OrderStatus): string {
  return ORDER_STATUS_COLORS[status] ?? ORDER_STATUS_COLORS.pending;
}

export function orderTotal(order: Order): number {
  const productsTotal = order.product.reduce((sum, p) => sum + Number(p.price), 0);
  const servicesTotal = order.services.reduce((sum, s) => sum + Number(s.service_price), 0);
  return productsTotal + servicesTotal;
}
