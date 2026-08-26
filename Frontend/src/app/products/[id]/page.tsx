"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ApiError, apiPublicGet } from "@/lib/api";
import type { Paginated, Product } from "@/lib/types";
import { DetailView } from "@/components/detail-view";
import { CartButton } from "@/components/cart-button";
import type { CatalogItem } from "@/components/catalog-grid";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<CatalogItem[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Настоящий fetch-эффект (не зеркалирование пропсов в стейт) — при смене
    // id намеренно сбрасываем notFound/error синхронно, чтобы не показывать
    // состояние предыдущего товара, пока грузится новый
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotFound(false);
    setError(null);
    setRelated([]);

    apiPublicGet<Product>(`/api/products/${id}/`)
      .then((data) => {
        setProduct(data);
        if (data.product_category) {
          apiPublicGet<Paginated<Product>>(`/api/products/?product_category=${data.product_category.id}`)
            .then((page) =>
              setRelated(
                page.results
                  .filter((p) => p.id !== data.id)
                  .slice(0, 4)
                  .map((p) => ({
                    id: p.id,
                    name: p.product_name,
                    price: p.price,
                    category: p.product_category,
                    is_available: p.is_available,
                    image: p.image,
                  })),
              ),
            )
            .catch(() => {
              // Похожие товары необязательны для страницы товара
            });
        }
      })
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
        <p className="text-stone">Товар не найден.</p>
        <Link href="/products" className="font-medium text-charcoal hover:underline">
          ← Все товары
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-6 py-16">
        <p className="text-cherry">{error}</p>
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
      crossSell={{
        message: "Нужна услуга к этому товару?",
        ctaLabel: "Смотреть услуги",
        href: "/services",
      }}
      related={related}
      relatedHrefBase="/products"
      relatedCategoryLabel={(category) => category.product_category ?? ""}
    />
  );
}
