import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CART_CHANGE_EVENT,
  addToCart,
  cartItemTotal,
  cartTotal,
  clearCart,
  getCart,
  isInCart,
  removeFromCart,
  setCartItemServices,
  useCart,
  type AttachedService,
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

const engraving: AttachedService = { id: 6, name: "Гравировка", price: "4990.00", details: "" };
const giftWrap: AttachedService = { id: 9, name: "Подарочная упаковка", price: "1500.00", details: "" };

describe("setCartItemServices", () => {
  it("attaches services only to the matching product, leaving other cart items untouched", () => {
    const otherProduct: CartItem = { ...product, id: 2, name: "Owala Limited" };
    addToCart(product);
    addToCart(otherProduct);

    setCartItemServices(product.id, [engraving]);

    const cart = getCart();
    expect(cart.find((i) => i.id === product.id)?.services).toEqual([engraving]);
    expect(cart.find((i) => i.id === otherProduct.id)?.services ?? []).toEqual([]);
  });

  it("replaces the whole services array (used to toggle a checkbox off)", () => {
    addToCart(product);
    setCartItemServices(product.id, [engraving, giftWrap]);
    setCartItemServices(product.id, [giftWrap]);

    expect(getCart()[0].services).toEqual([giftWrap]);
  });

  it("is a no-op for a standalone service cart item (services only attach to products)", () => {
    addToCart(service);
    setCartItemServices(service.id, [engraving]);

    expect(getCart()[0].services).toBeUndefined();
  });
});

describe("cartItemTotal / cartTotal", () => {
  it("sums the item price alone when it has no attached services", () => {
    expect(cartItemTotal(product)).toBe(450000);
  });

  it("adds attached service prices on top of the item price", () => {
    const withServices: CartItem = { ...product, services: [engraving, giftWrap] };
    expect(cartItemTotal(withServices)).toBe(450000 + 4990 + 1500);
  });

  it("cartTotal sums cartItemTotal across every cart item, including attached services", () => {
    const withEngraving: CartItem = { ...product, services: [engraving] };
    expect(cartTotal([withEngraving, service])).toBe(450000 + 4990 + 15000);
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
