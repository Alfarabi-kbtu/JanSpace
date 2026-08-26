"use client";

import { addToCart, removeFromCart, useCart, type CartItem } from "@/lib/cart";

const addClass =
  "w-full sm:w-auto bg-charcoal px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-swamp disabled:cursor-not-allowed disabled:opacity-50";

const removeClass =
  "w-full sm:w-auto border border-charcoal px-6 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-cream";

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
