"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "@/lib/auth";

const items = [
  { href: "/account", label: "Обзор" },
  { href: "/orders", label: "Мои заказы" },
  { href: "/profile", label: "Профиль" },
  { href: "/complaints", label: "Поддержка" },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearTokens();
    router.push("/");
  }

  return (
    <nav className="flex flex-row flex-wrap gap-1 border-b border-edge pb-4 lg:w-52 lg:flex-shrink-0 lg:flex-col lg:gap-1 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
      {items.map((item) => {
        const active = item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-charcoal text-cream" : "text-charcoal hover:bg-blush-soft"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={handleLogout}
        className="px-3 py-2 text-left text-sm font-medium text-stone transition-colors hover:text-cherry"
      >
        Выйти
      </button>
    </nav>
  );
}
