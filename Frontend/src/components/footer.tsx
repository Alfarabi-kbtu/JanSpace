import Link from "next/link";

// Колонки footer'а — только реально существующие в приложении разделы.
// В отличие от Design website UI_UX/src/components/Footer.tsx, здесь нет
// строки подписки на рассылку, соцсетей и Privacy/Terms — под них нет ни
// бэкенда, ни реальных страниц, а фейковые несработающие ссылки/формы
// запрещены заданием (см. "DATA & BACKEND RULE" / "FUNCTIONALITY OVER APPEARANCE").
const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Каталог",
    links: [
      { label: "Товары", href: "/products" },
      { label: "Услуги", href: "/services" },
    ],
  },
  {
    title: "Аккаунт",
    links: [
      { label: "Мой аккаунт", href: "/account" },
      { label: "Корзина", href: "/cart" },
    ],
  },
  {
    title: "Поддержка",
    links: [
      { label: "Жалобы и обращения", href: "/complaints" },
      { label: "Контакты", href: "/contacts" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-charcoal text-cream">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <span className="font-serif text-2xl text-cream">JanSpace</span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
              Товары и услуги в одном месте.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-cream/50">
                {column.title}
              </p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-cream/70 transition-colors hover:text-cream">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-cream/10 pt-8">
          <p className="text-xs text-cream/40">© {new Date().getFullYear()} JanSpace.</p>
        </div>
      </div>
    </footer>
  );
}
