"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { AUTH_CHANGE_EVENT, getAccessToken } from "@/lib/auth";
import { useCart } from "@/lib/cart";

// Токен живёт в localStorage — сервер его не видит, поэтому статус входа
// читаем через useSyncExternalStore: на сервере/до гидратации всегда false
// (getServerSnapshot), а на клиенте синхронизируется с реальным значением
// и переподписывается на кастомное событие из lib/auth.ts при логине/логауте
function subscribe(callback: () => void) {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, callback);
}

function getSnapshot() {
  return Boolean(getAccessToken());
}

function getServerSnapshot() {
  return false;
}

const navLinks = [
  { label: "Товары", href: "/products" },
  { label: "Услуги", href: "/services" },
  { label: "Контакты", href: "/contacts" },
];

export function Header() {
  const loggedIn = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const cart = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Выход (clearTokens) живёт на /account — в дизайне логаут вынесен из
  // хедера в сайдбар аккаунта, а не отдельная кнопка на каждой странице
  const accountHref = loggedIn ? "/account" : "/login";

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-cream">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex-shrink-0 font-serif text-xl text-charcoal">
          JanSpace
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-charcoal transition-colors hover:text-coral"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href={accountHref}
            className="hidden p-2 text-charcoal transition-colors hover:text-coral sm:flex"
            aria-label="Аккаунт"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </Link>

          <Link
            href="/cart"
            className="relative p-2 text-charcoal transition-colors hover:text-coral"
            aria-label="Корзина"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
              />
            </svg>
            {cart.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cherry text-[10px] font-bold leading-none text-cream">
                {cart.length > 9 ? "9+" : cart.length}
              </span>
            )}
          </Link>

          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="p-2 text-charcoal transition-colors hover:text-coral md:hidden"
            aria-label="Меню"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="space-y-1 border-t border-edge bg-cream px-4 py-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block border-b border-edge py-3 text-sm font-medium text-charcoal transition-colors last:border-0 hover:text-coral"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={accountHref}
            onClick={() => setMobileMenuOpen(false)}
            className="block py-3 text-sm font-medium text-charcoal transition-colors hover:text-coral"
          >
            {loggedIn ? "Мой аккаунт" : "Войти"}
          </Link>
        </div>
      )}
    </header>
  );
}
