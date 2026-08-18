import Link from "next/link";
import type { Category } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export type CatalogItem = {
  id: number;
  name: string;
  price: string;
  category: Category | null;
  is_available: boolean;
  image: string | null;
};

export function CatalogGrid({
  items,
  loading,
  error,
  emptyMessage,
  categories,
  categoryLabel,
  selectedCategory,
  onCategoryChange,
  availableOnly,
  onAvailableOnlyChange,
  page,
  hasNext,
  hasPrevious,
  onPageChange,
  hrefBase,
}: {
  items: CatalogItem[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  categories: Category[];
  categoryLabel: (category: Category) => string;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  availableOnly: boolean;
  onAvailableOnlyChange: (value: boolean) => void;
  page: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
  hrefBase: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-900 outline-none dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50"
        >
          <option value="">Все категории</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => onAvailableOnlyChange(e.target.checked)}
            className="h-4 w-4 rounded border-black/[.2] dark:border-white/[.3]"
          />
          Только в наличии
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {!error && loading && <p className="text-sm text-zinc-500 dark:text-zinc-400">Загрузка…</p>}

      {!error && !loading && items.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
      )}

      {!error && !loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`${hrefBase}/${item.id}`}
              className="flex flex-col overflow-hidden rounded-xl border border-black/[.08] transition-colors hover:border-black/[.16] dark:border-white/[.145] dark:hover:border-white/[.25]"
            >
              <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-900">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- домен картинок динамический (S3-бакет), next/image потребовал бы захардкодить remotePatterns
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
                    Нет фото
                  </div>
                )}
                {!item.is_available && (
                  <span className="absolute left-2 top-2 rounded-full bg-zinc-900/80 px-2 py-0.5 text-xs font-medium text-white">
                    Нет в наличии
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                {item.category && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{categoryLabel(item.category)}</span>
                )}
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{item.name}</h3>
                <p className="mt-auto pt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatPrice(item.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!error && !loading && (hasPrevious || hasNext) && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrevious}
            className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.03] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
          >
            Назад
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Страница {page}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/[.03] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-white/[.06]"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
