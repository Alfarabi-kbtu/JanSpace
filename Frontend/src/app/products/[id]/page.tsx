"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ApiError, apiPublicGet } from "@/lib/api";
import type { Product } from "@/lib/types";
import { DetailView } from "@/components/detail-view";
import { CartButton } from "@/components/cart-button";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Настоящий fetch-эффект (не зеркалирование пропсов в стейт) — при смене
    // id намеренно сбрасываем notFound/error синхронно, чтобы не показывать
    // состояние предыдущего товара, пока грузится новый
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotFound(false);
    setError(null);

    apiPublicGet<Product>(`/api/products/${id}/`)
      .then(setProduct)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError("Не удалось загрузить товар.");
        }
      });
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="text-zinc-600 dark:text-zinc-400">Товар не найден.</p>
        <Link href="/products" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
          ← Все товары
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <DetailView
      name={product.product_name}
      price={product.price}
      category={product.product_category}
      categoryLabel={(category) => category.product_category ?? ""}
      is_available={product.is_available}
      image={product.image}
      backHref="/products"
      backLabel="Все товары"
      actions={
        <CartButton
          type="product"
          id={product.id}
          name={product.product_name}
          price={product.price}
          image={product.image}
          disabled={!product.is_available}
        />
      }
    />
  );
}
