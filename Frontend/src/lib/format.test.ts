import { describe, expect, it } from "vitest";
import { formatDate, formatPrice, orderStatusColorClass, orderStatusLabel, orderTotal } from "./format";
import type { Order, Product, Service } from "./types";

describe("formatPrice", () => {
  it("appends the tenge sign, matching the runtime's own ru-RU formatting", () => {
    // Сравниваем с тем же вызовом toLocaleString, а не с захардкоженной
    // строкой — разделитель тысяч в ru-RU зависит от ICU-данных рантайма
    // (обычный пробел или неразрывный), но должен совпадать сам с собой
    expect(formatPrice("450000.00")).toBe(`${(450000).toLocaleString("ru-RU")} ₸`);
    expect(formatPrice("199.99")).toBe(`${(199.99).toLocaleString("ru-RU")} ₸`);
  });

  it("passes through non-numeric input unchanged instead of showing NaN", () => {
    expect(formatPrice("not-a-number")).toBe("not-a-number");
  });
});

describe("formatDate", () => {
  it("formats an ISO timestamp as a Russian date and time, not the raw ISO string", () => {
    const result = formatDate("2026-03-15T10:30:00Z");
    expect(result).not.toBe("2026-03-15T10:30:00Z");
    expect(result).toContain("2026");
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe("orderStatusLabel", () => {
  it("labels every known status in Russian", () => {
    expect(orderStatusLabel("pending")).toBe("Ожидает обработки");
    expect(orderStatusLabel("processing")).toBe("В обработке");
    expect(orderStatusLabel("completed")).toBe("Выполнен");
    expect(orderStatusLabel("cancelled")).toBe("Отменён");
  });
});

describe("orderStatusColorClass", () => {
  it("gives each status a distinct color class", () => {
    const classes = (["pending", "processing", "completed", "cancelled"] as const).map(orderStatusColorClass);
    expect(new Set(classes).size).toBe(4);
  });
});

describe("orderTotal", () => {
  const product = (price: string): Product => ({
    id: 1,
    product_name: "Test product",
    product_category: null,
    price,
    is_available: true,
    image: null,
  });

  const service = (service_price: string): Service => ({
    id: 1,
    service_name: "Test service",
    service_category: null,
    service_price,
    is_available: true,
    image: null,
  });

  const order = (products: Product[], services: Service[]): Order => ({
    order_id: "test-order",
    order_date: "2026-01-01T00:00:00Z",
    order_status: "pending",
    user: 1,
    product: products,
    services,
  });

  it("sums product prices and service prices together", () => {
    expect(orderTotal(order([product("450000.00"), product("8000.00")], [service("15000.00")]))).toBe(473000);
  });

  it("returns 0 for an order with no items", () => {
    expect(orderTotal(order([], []))).toBe(0);
  });
});
