"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Общий split-screen для /login и /register — в дизайне это одна страница с
// переключением вкладок через локальный стейт, здесь сохранены отдельные
// роуты (реальный флоу авторизации завязан на них — см. Frontend/CLAUDE.md),
// но переключатель между ними выглядит как те же вкладки
export function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex gap-6 border-b border-edge pb-1">
            <Link
              href="/login"
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                pathname === "/login" ? "border-charcoal text-charcoal" : "border-transparent text-stone hover:text-charcoal"
              }`}
            >
              Вход
            </Link>
            <Link
              href="/register"
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                pathname === "/register" ? "border-charcoal text-charcoal" : "border-transparent text-stone hover:text-charcoal"
              }`}
            >
              Регистрация
            </Link>
          </div>
          {children}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-swamp lg:block">
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-4xl leading-tight text-cream">
            Товары и услуги —<br />
            <em>в одном аккаунте.</em>
          </p>
        </div>
      </div>
    </div>
  );
}
