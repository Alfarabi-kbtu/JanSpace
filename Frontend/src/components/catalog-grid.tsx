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

// Карточка товара/услуги — общая для CatalogGrid (страницы /products, /services)
// и превью на главной, чтобы не дублировать разметку в двух местах (в отличие
// от Design website UI_UX, где ProductCard продублирован в HomePage и CatalogPage).
export function CatalogCard({ item, categoryLabel, hrefBase }: {
  item: CatalogItem;
  categoryLabel: (category: Category) => string;
  hrefBase: string;
}) {
  return (
    <Link key={item.id} href={`${hrefBase}/${item.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-blush-soft">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- домен картинок динамический (S3-бакет), next/image потребовал бы захардкодить remotePatterns
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone">Нет фото</div>
        )}
        {!item.is_available && (
          <span className="absolute left-3 top-3 bg-cherry px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cream">
            Нет в наличии
          </span>
        )}
      </div>
      <div className="pt-3">
        {item.category && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-stone">
            {categoryLabel(item.category)}
          </p>
        )}
        <h3 className="text-sm font-semibold leading-snug text-charcoal">{item.name}</h3>
        <p className="mt-1 text-sm font-bold text-charcoal">{formatPrice(item.price)}</p>
      </div>
    </Link>
  );
}

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
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <aside className="flex flex-row flex-wrap items-center gap-4 lg:w-56 lg:flex-shrink-0 lg:flex-col lg:items-stretch lg:gap-6">
        <div className="flex flex-col gap-2 lg:w-full">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone">Категория</span>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="border border-edge bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-charcoal lg:w-full"
          >
            <option value="">Все категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => onAvailableOnlyChange(e.target.checked)}
            className="h-4 w-4 accent-swamp"
          />
          Только в наличии
        </label>
      </aside>

      <div className="flex-1">
        {error && <p className="bg-cherry/10 px-3.5 py-2.5 text-sm text-cherry">{error}</p>}

        {!error && loading && <p className="text-sm text-stone">Загрузка…</p>}

        {!error && !loading && items.length === 0 && <p className="text-sm text-stone">{emptyMessage}</p>}

        {!error && !loading && items.length > 0 && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-3">
            {items.map((item) => (
              <CatalogCard key={item.id} item={item} categoryLabel={categoryLabel} hrefBase={hrefBase} />
            ))}
          </div>
        )}

        {!error && !loading && (hasPrevious || hasNext) && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrevious}
              className="border border-charcoal px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal hover:text-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-charcoal"
            >
              Назад
            </button>
            <span className="text-sm text-stone">Страница {page}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNext}
              className="border border-charcoal px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal hover:text-cream disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-charcoal"
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
