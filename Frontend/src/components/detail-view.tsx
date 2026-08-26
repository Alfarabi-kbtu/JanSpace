import Link from "next/link";
import type { Category } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { CatalogCard, type CatalogItem } from "@/components/catalog-grid";

export function DetailView({
  name,
  price,
  category,
  categoryLabel,
  is_available,
  image,
  backHref,
  backLabel,
  actions,
  crossSell,
  related,
  relatedHrefBase,
  relatedCategoryLabel,
}: {
  name: string;
  price: string;
  category: Category | null;
  categoryLabel: (category: Category) => string;
  is_available: boolean;
  image: string | null;
  backHref: string;
  backLabel: string;
  actions?: React.ReactNode;
  // Кросс-продажа между товарами и услугами — реальная связь (оба каталога
  // существуют в бэкенде), в отличие от выдуманных характеристик/отзывов
  // из Design website UI_UX/src/pages/ProductDetailPage.tsx
  crossSell?: { message: string; ctaLabel: string; href: string };
  related?: CatalogItem[];
  relatedHrefBase?: string;
  relatedCategoryLabel?: (category: Category) => string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <Link href={backHref} className="text-sm text-stone transition-colors hover:text-coral">
        ← {backLabel}
      </Link>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="aspect-[4/5] w-full overflow-hidden bg-blush-soft">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- домен картинок динамический (S3-бакет), next/image потребовал бы захардкодить remotePatterns
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone">Нет фото</div>
          )}
        </div>

        <div className="flex flex-col">
          {category && (
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-swamp">
              {categoryLabel(category)}
            </p>
          )}
          <h1 className="mb-6 text-4xl leading-tight text-charcoal">{name}</h1>

          <div className="mb-7 flex items-baseline gap-3 border-b border-edge pb-7">
            <span className="text-3xl font-bold text-charcoal">{formatPrice(price)}</span>
            {is_available ? (
              <span className="bg-swamp/10 px-3 py-1 text-sm font-medium text-swamp-deep">В наличии</span>
            ) : (
              <span className="bg-cherry/10 px-3 py-1 text-sm font-medium text-cherry">Нет в наличии</span>
            )}
          </div>

          {actions && <div className="mb-6">{actions}</div>}

          {crossSell && (
            <div className="flex items-center justify-between gap-4 bg-mist p-4">
              <p className="text-sm text-charcoal">{crossSell.message}</p>
              <Link
                href={crossSell.href}
                className="whitespace-nowrap text-xs font-semibold text-swamp underline underline-offset-2 hover:text-charcoal"
              >
                {crossSell.ctaLabel}
              </Link>
            </div>
          )}
        </div>
      </div>

      {related && related.length > 0 && relatedHrefBase && relatedCategoryLabel && (
        <div className="mt-6 border-t border-edge pt-12">
          <h2 className="mb-8 text-2xl text-charcoal">Похожее</h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">
            {related.map((item) => (
              <CatalogCard key={item.id} item={item} categoryLabel={relatedCategoryLabel} hrefBase={relatedHrefBase} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
