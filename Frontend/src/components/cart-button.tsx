"use client";

import { addToCart, removeFromCart, useCart, type CartItem } from "@/lib/cart";

const addClass =
  "w-fit rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";

const removeClass =
  "w-fit rounded-lg border border-black/[.08] px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.03] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]";

export function CartButton({
  type,
  id,
  name,
  price,
  image,
  disabled,
}: {
  type: CartItem["type"];
  id: number;
  name: string;
  price: string;
  image: string | null;
  disabled?: boolean;
}) {
  const cart = useCart();
  const inCart = cart.some((item) => item.type === type && item.id === id);

  function handleClick() {
    if (inCart) {
      removeFromCart(type, id);
    } else {
      addToCart({ type, id, name, price, image });
    }
  }

  if (disabled) {
    return (
      <button disabled className={addClass}>
        Нет в наличии
      </button>
    );
  }

  return (
    <button onClick={handleClick} className={inCart ? removeClass : addClass}>
      {inCart ? "Убрать из корзины" : "В корзину"}
    </button>
  );
}
