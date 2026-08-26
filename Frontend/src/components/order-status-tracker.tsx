import type { OrderStatus } from "@/lib/types";

// Прогресс-бар по реальным 4 статусам бэкенда (Order.order_status —
// см. Backend/orders/models.py). В дизайне был 6-шаговый таймлайн
// (Order placed / Payment confirmed / Preparing / Shipped / Out for
// delivery / Delivered) — этих промежуточных состояний на бэкенде нет,
// поэтому здесь только то, что реально можно отследить.
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Ожидает обработки" },
  { status: "processing", label: "В обработке" },
  { status: "completed", label: "Выполнен" },
];

export function OrderStatusTracker({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return <p className="bg-cherry/10 px-4 py-3 text-sm font-medium text-cherry">Заказ отменён</p>;
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="flex items-start">
      {STEPS.map((step, i) => {
        const reached = i <= currentIndex;
        return (
          <li key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span className={`h-3 w-3 flex-shrink-0 rounded-full ${reached ? "bg-swamp" : "bg-edge"}`} />
              <span
                className={`whitespace-nowrap text-xs ${
                  i === currentIndex ? "font-semibold text-charcoal" : reached ? "text-charcoal" : "text-stone"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`mx-2 mb-5 h-px flex-1 ${i < currentIndex ? "bg-swamp" : "bg-edge"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
