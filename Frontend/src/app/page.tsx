"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiPublicGet } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Category, Paginated, Product, Service } from "@/lib/types";
import { CatalogCard, type CatalogItem } from "@/components/catalog-grid";

// Реальные преимущества сервиса — без выдуманных цифр/отзывов (в дизайне
// на их месте были "4.8★", "12,000+ покупателей" и т.п., ничем не
// подтверждённые для JanSpace, см. FINAL REPORT/§18-19 прошлого research pass)
const VALUE_PROPS = [
  {
    label: "Товары и услуги в одном месте",
    body: "Не нужно искать разные сайты — оформляйте заказ на товар и услугу в одной корзине.",
  },
  {
    label: "Статус заказа в реальном времени",
    body: "Изменение статуса заказа приходит мгновенно, без обновления страницы.",
  },
  {
    label: "Личный кабинет с историей заказов",
    body: "Все ваши заказы и их статусы — в одном месте, в любое время.",
  },
  {
    label: "Быстрая обратная связь",
    body: "Есть вопрос или проблема с заказом — напишите нам, ответим оперативно.",
  },
];

const TILE_COLORS = ["bg-blush-soft", "bg-mist", "bg-sky/40", "bg-olive/25"];

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    apiPublicGet<Paginated<Category>>("/api/categories/")
      .then((data) => setCategories(data.results))
      .catch(() => {
        // Плитки категорий необязательны для главной — просто не показываем секцию
      });
    apiPublicGet<Paginated<Product>>("/api/products/?is_available=true")
      .then((data) => setProducts(data.results.slice(0, 4)))
      .catch(() => {});
    apiPublicGet<Paginated<Service>>("/api/services/?is_available=true")
      .then((data) => setServices(data.results.slice(0, 3)))
      .catch(() => {});
  }, []);

  const categoryTiles = [
    ...categories.filter((c) => c.product_category).map((c) => ({ id: c.id, label: c.product_category as string, href: `/products?category=${c.id}` })),
    ...categories.filter((c) => c.service_category).map((c) => ({ id: c.id, label: c.service_category as string, href: `/services?category=${c.id}` })),
  ].slice(0, 6);

  const productItems: CatalogItem[] = products.map((p) => ({
    id: p.id,
    name: p.product_name,
    price: p.price,
    category: p.product_category,
    is_available: p.is_available,
    image: p.image,
  }));

  const serviceItems: CatalogItem[] = services.map((s) => ({
    id: s.id,
    name: s.service_name,
    price: s.service_price,
    category: s.service_category,
    is_available: s.is_available,
    image: s.image,
  }));

  const heroImages = products.filter((p) => p.image).slice(0, 2);

  return (
    <main>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-2">
          <div className="lg:order-2 lg:pb-12">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-widest text-swamp">
              Магазин товаров и услуг
            </p>
            <h1 className="mb-6 text-5xl leading-[1.05] text-charcoal sm:text-6xl">
              Всё нужное —<br />
              <span className="italic text-coral">в одном месте.</span>
            </h1>
            <p className="mb-8 max-w-md text-base leading-relaxed text-stone">
              Товары и услуги в одном каталоге. Зарегистрируйтесь, чтобы оформлять заказы и следить
              за их статусом в реальном времени.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="bg-charcoal px-7 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-swamp"
              >
                Смотреть товары
              </Link>
              <Link
                href="/services"
                className="border border-charcoal px-7 py-3.5 text-sm font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-cream"
              >
                Смотреть услуги
              </Link>
            </div>
          </div>

          <div className="lg:order-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1 row-span-2 min-h-[380px] overflow-hidden bg-blush-soft">
                {heroImages[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- домен картинок динамический (S3-бакет)
                  <img src={heroImages[0].image!} alt={heroImages[0].product_name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="col-span-1 space-y-3">
                <div className="h-[185px] overflow-hidden bg-mist">
                  {heroImages[1] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- домен картинок динамический (S3-бакет)
                    <img src={heroImages[1].image!} alt={heroImages[1].product_name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex h-[185px] items-center justify-center bg-swamp p-4">
                  <p className="text-center text-xl leading-tight text-cream">
                    Отслеживаем
                    <br />
                    каждый заказ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY STRIP */}
      {categoryTiles.length > 0 && (
        <section className="border-t border-edge">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="mb-8 text-2xl text-charcoal">Категории</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {categoryTiles.map((tile, i) => (
                <Link key={`${tile.href}-${tile.id}`} href={tile.href} className="group text-left">
                  <div className={`mb-2 flex aspect-square items-center justify-center ${TILE_COLORS[i % TILE_COLORS.length]}`}>
                    <span className="px-2 text-center text-sm font-semibold text-charcoal">{tile.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      {productItems.length > 0 && (
        <section className="border-t border-edge">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone">Из каталога</p>
                <h2 className="text-3xl text-charcoal">Товары</h2>
              </div>
              <Link href="/products" className="hidden text-sm font-medium text-charcoal underline underline-offset-4 transition-colors hover:text-coral sm:block">
                Смотреть все
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">
              {productItems.map((item) => (
                <CatalogCard key={item.id} item={item} categoryLabel={(c) => c.product_category ?? ""} hrefBase="/products" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SERVICES CTA BAND */}
      <section className="bg-swamp">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-olive">Услуги</p>
              <h2 className="mb-5 text-4xl leading-tight text-cream">
                Не только товары —<br />
                ещё и <em>услуги</em>.
              </h2>
              <p className="mb-8 max-w-md text-sm leading-relaxed text-cream/70">
                Закажите нужную услугу так же просто, как товар — прямо из общей корзины.
              </p>
              {services.length > 0 && (
                <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {services.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="h-1 w-1 flex-shrink-0 rounded-full bg-blush" />
                      <span className="text-sm text-cream/80">{s.service_name}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/services" className="inline-block bg-cream px-7 py-3.5 text-sm font-semibold text-charcoal transition-colors hover:bg-blush">
                Смотреть все услуги
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHY JANSPACE */}
      <section className="border-t border-edge">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-stone">JanSpace</p>
              <h2 className="text-3xl leading-tight text-charcoal">
                Почему выбирают
                <br />
                нас.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:col-span-3">
              {VALUE_PROPS.map(({ label, body }) => (
                <div key={label} className="flex gap-4">
                  <div className="mt-1 h-12 w-1 flex-shrink-0 bg-blush" />
                  <div>
                    <p className="mb-1 text-sm font-semibold text-charcoal">{label}</p>
                    <p className="text-sm leading-relaxed text-stone">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR SERVICES */}
      {serviceItems.length > 0 && (
        <section className="border-t border-edge bg-mist">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-10 flex items-end justify-between">
              <h2 className="text-3xl text-charcoal">Услуги</h2>
              <Link href="/services" className="hidden text-sm font-medium text-charcoal underline underline-offset-4 transition-colors hover:text-coral sm:block">
                Все услуги
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {services.map((service) => (
                <Link key={service.id} href={`/services/${service.id}`} className="group text-left">
                  <div className="mb-4 h-[220px] overflow-hidden bg-edge">
                    {service.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- домен картинок динамический (S3-бакет)
                      <img src={service.image} alt={service.service_name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-stone">Нет фото</div>
                    )}
                  </div>
                  {service.service_category?.service_category && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-swamp">
                      {service.service_category.service_category}
                    </p>
                  )}
                  <h3 className="mb-1 text-base font-semibold text-charcoal">{service.service_name}</h3>
                  <span className="text-sm font-bold text-charcoal">{formatPrice(service.service_price)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
