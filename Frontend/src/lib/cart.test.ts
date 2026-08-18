import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CART_CHANGE_EVENT,
  addToCart,
  clearCart,
  getCart,
  isInCart,
  removeFromCart,
  useCart,
  type CartItem,
} from "./cart";

const product: CartItem = { type: "product", id: 1, name: "Ноутбук ASUS", price: "450000.00", image: null };
const service: CartItem = { type: "service", id: 1, name: "Ремонт ноутбука", price: "15000.00", image: null };

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("addToCart", () => {
  it("adds a new item", () => {
    addToCart(product);
    expect(getCart()).toEqual([product]);
  });

  it("is a no-op when the same type+id is already in the cart (orders are a set, not quantities)", () => {
    addToCart(product);
    addToCart({ ...product, name: "renamed on the second add" });
    expect(getCart()).toEqual([product]);
  });

  it("treats a product and a service with the same numeric id as distinct entries", () => {
    addToCart(product);
    addToCart({ ...service, id: product.id });
    expect(getCart()).toHaveLength(2);
  });

  it("notifies listeners", () => {
    const listener = vi.fn();
    window.addEventListener(CART_CHANGE_EVENT, listener);
    addToCart(product);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("removeFromCart", () => {
  it("removes only the matching type+id", () => {
    addToCart(product);
    addToCart(service);
    removeFromCart(product.type, product.id);
    expect(getCart()).toEqual([service]);
  });

  it("is a no-op when the item isn't in the cart", () => {
    addToCart(product);
    removeFromCart("service", 999);
    expect(getCart()).toEqual([product]);
  });
});

describe("isInCart", () => {
  it("reflects membership by type+id", () => {
    addToCart(product);
    expect(isInCart("product", product.id)).toBe(true);
    expect(isInCart("service", product.id)).toBe(false);
  });
});

describe("clearCart", () => {
  it("empties the cart", () => {
    addToCart(product);
    addToCart(service);
    clearCart();
    expect(getCart()).toEqual([]);
  });
});

describe("useCart", () => {
  it("starts with the persisted cart and re-renders when it changes", () => {
    addToCart(product);

    const { result } = renderHook(() => useCart());
    expect(result.current).toEqual([product]);

    act(() => {
      addToCart(service);
    });

    expect(result.current).toEqual([product, service]);
  });
});
