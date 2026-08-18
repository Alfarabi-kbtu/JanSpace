import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        JanSpace
      </h1>
      <p className="mt-4 max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
        Товары и услуги в одном месте. Зарегистрируйтесь, чтобы оформлять заказы и отслеживать их статус.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/products"
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Смотреть товары
        </Link>
        <Link
          href="/services"
          className="rounded-full border border-black/[.08] px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-black/[.03] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-white/[.06]"
        >
          Смотреть услуги
        </Link>
      </div>
    </main>
  );
}
