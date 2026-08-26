"use client";

import { useSyncExternalStore } from "react";

// Заказы на бэкенде — ManyToMany без количества (см. Backend/orders/models.py:
// Order.product/Order.services — просто множество id, без поля quantity).
// Поэтому корзина здесь — это тоже множество: товар либо добавлен, либо нет,
// "количество" как понятие не существует
//
// Доп.услуга (гравировка, подарочная упаковка...), привязанная к конкретному
// товару в корзине — соответствует backend-модели orders.OrderServiceItem.
// id/name/price — снимок каталожной услуги (Service.id/service_name/
// service_price) на момент выбора, чтобы корзина не дёргала API на каждый
// рендер; на бэкенде при создании заказа цена всё равно берётся заново из
// каталога по id, а не из этого снимка (клиент не может подменить цену)
export type AttachedService = {
  id: number;
  name: string;
  price: string;
  details: string;
};

export type CartItem = {
  type: "product" | "service";
  id: number;
  name: string;
  price: string;
  image: string | null;
  // Доп.услуги, привязанные к ЭТОМУ товару — имеет смысл только для
  // type === "product". У standalone-услуг (type === "service", добавленных
  // из каталога напрямую как самостоятельная позиция) всегда пусто: это
  // другой сценарий, услуга сама по себе, а не привязанная к товару
  services?: AttachedService[];
};

const CART_KEY = "janspace_cart";
export const CART_CHANGE_EVENT = "janspace-cart-change";

function notifyCartChange() {
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

// Кэшируем распарсенный массив и пересчитываем только если сырая строка в
// localStorage реально изменилась — useSyncExternalStore требует, чтобы
// getSnapshot() отдавал стабильную ссылку, когда ничего не поменялось,
// иначе он бы решил, что стейт меняется на каждом рендере
let cachedRaw: string | null = null;
let cachedCart: CartItem[] = [];
const EMPTY_CART: CartItem[] = [];

function readCart(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_CART;

  const raw = localStorage.getItem(CART_KEY);
  if (raw === cachedRaw) return cachedCart;

  cachedRaw = raw;
  try {
    cachedCart = raw ? JSON.parse(raw) : [];
  } catch {
    cachedCart = [];
  }
  return cachedCart;
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  notifyCartChange();
}

export function getCart(): CartItem[] {
  return readCart();
}

export function isInCart(type: CartItem["type"], id: number): boolean {
  return readCart().some((item) => item.type === type && item.id === id);
}

export function addToCart(item: CartItem) {
  const cart = readCart();
  if (cart.some((i) => i.type === item.type && i.id === item.id)) return;
  writeCart([...cart, item]);
}

export function removeFromCart(type: CartItem["type"], id: number) {
  writeCart(readCart().filter((i) => !(i.type === type && i.id === id)));
}

export function clearCart() {
  writeCart([]);
}

// Полностью заменяет набор доп.услуг, привязанных к товару с данным id
// (id — товарный, не услуги; сам товар всегда type === "product") —
// используется для чекбоксов "нужна гравировка" и т.п. в корзине
export function setCartItemServices(id: number, services: AttachedService[]) {
  const cart = readCart();
  writeCart(cart.map((item) => (item.type === "product" && item.id === id ? { ...item, services } : item)));
}

// Стоимость одной позиции корзины вместе с привязанными к ней доп.услугами —
// единая точка расчёта, чтобы сумма в корзине и payload заказа не расходились
export function cartItemTotal(item: CartItem): number {
  const servicesTotal = (item.services ?? []).reduce((sum, service) => sum + Number(service.price), 0);
  return Number(item.price) + servicesTotal;
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + cartItemTotal(item), 0);
}

function subscribe(callback: () => void) {
  window.addEventListener(CART_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CART_CHANGE_EVENT, callback);
}

function getServerSnapshot() {
  return EMPTY_CART;
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, readCart, getServerSnapshot);
}
