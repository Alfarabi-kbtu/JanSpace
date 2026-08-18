import Link from "next/link";
import type { Category } from "@/lib/types";
import { formatPrice } from "@/lib/format";

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
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <Link
        href={backHref}
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← {backLabel}
      </Link>
      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="relative aspect-square w-full flex-shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900 sm:w-80">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- домен картинок динамический (S3-бакет), next/image потребовал бы захардкодить remotePatterns
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-600">
              Нет фото
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          {category && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{categoryLabel(category)}</span>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{name}</h1>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{formatPrice(price)}</p>
          {is_available ? (
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              В наличии
            </span>
          ) : (
            <span className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              Нет в наличии
            </span>
          )}
          {actions && <div className="pt-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
