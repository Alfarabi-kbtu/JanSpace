"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AUTH_CHANGE_EVENT, clearTokens, getAccessToken } from "@/lib/auth";
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

export function Header() {
  const loggedIn = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const cart = useCart();
  const router = useRouter();

  function handleLogout() {
    clearTokens();
    router.push("/");
  }

  return (
    <header className="border-b border-black/[.08] dark:border-white/[.145]">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            JanSpace
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/products"
              className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Товары
            </Link>
            <Link
              href="/services"
              className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Услуги
            </Link>
            <Link
              href="/contacts"
              className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Контакты
            </Link>
          </nav>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/cart"
            className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Корзина{cart.length > 0 ? ` (${cart.length})` : ""}
          </Link>
          {loggedIn ? (
            <>
              <Link
                href="/orders"
                className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Мои заказы
              </Link>
              <Link
                href="/complaints"
                className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Жалобы
              </Link>
              <Link
                href="/profile"
                className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Профиль
              </Link>
              <button
                onClick={handleLogout}
                className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-zinc-900 px-4 py-1.5 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
