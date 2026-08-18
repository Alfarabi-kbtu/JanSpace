"use client";

import { useEffect, useState } from "react";
import { apiPublicGet } from "@/lib/api";
import { parseApiError } from "@/lib/errors";
import type { Category, Paginated, Product } from "@/lib/types";
import { CatalogGrid, type CatalogItem } from "@/components/catalog-grid";

export default function ProductsPage() {
  const [products, setProducts] = useState<Paginated<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Категории с непустым product_category — те же категории используются
    // и для услуг (см. Frontend/CLAUDE.md), отфильтровываем нерелевантные
    apiPublicGet<Paginated<Category>>("/api/categories/")
      .then((data) => setCategories(data.results.filter((c) => c.product_category)))
      .catch(() => {
        // Список категорий необязателен для просмотра товаров — просто
        // не показываем фильтр, если он не загрузился
      });
  }, []);

  useEffect(() => {
    // Настоящий fetch-эффект (не зеркалирование пропсов в стейт) — при смене
    // фильтра/страницы намеренно сбрасываем loading/error синхронно, чтобы
    // не показывать устаревшие данные, пока идёт новый запрос
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page) });
    if (selectedCategory) params.set("product_category", selectedCategory);
    if (availableOnly) params.set("is_available", "true");

    apiPublicGet<Paginated<Product>>(`/api/products/?${params.toString()}`)
      .then(setProducts)
      .catch((err) => setError(parseApiError(err).message ?? "Не удалось загрузить товары."))
      .finally(() => setLoading(false));
  }, [selectedCategory, availableOnly, page]);

  function handleCategoryChange(value: string) {
    setSelectedCategory(value);
    setPage(1);
  }

  function handleAvailableOnlyChange(value: boolean) {
    setAvailableOnly(value);
    setPage(1);
  }

  const items: CatalogItem[] =
    products?.results.map((product) => ({
      id: product.id,
      name: product.product_name,
      price: product.price,
      category: product.product_category,
      is_available: product.is_available,
      image: product.image,
    })) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Товары</h1>
      <CatalogGrid
        items={items}
        loading={loading}
        error={error}
        emptyMessage="Товары не найдены."
        categories={categories}
        categoryLabel={(category) => category.product_category ?? ""}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        availableOnly={availableOnly}
        onAvailableOnlyChange={handleAvailableOnlyChange}
        page={page}
        hasNext={Boolean(products?.next)}
        hasPrevious={Boolean(products?.previous)}
        onPageChange={setPage}
        hrefBase="/products"
      />
    </div>
  );
}
