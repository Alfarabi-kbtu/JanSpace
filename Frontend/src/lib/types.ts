// Типы под контракт бэкенда (см. Frontend/CLAUDE.md, разделы "REST-ресурсы"
// и "Известные особенности бэкенда")

// "regular" — обычная категория товаров/услуг, остальные три значения —
// категории оформления заказа (см. Backend/CLAUDE.md, categories.Category.kind)
export type CategoryKind = "regular" | "delivery" | "engraving" | "preorder";

export type Category = {
  id: number;
  // Category используется и для товаров, и для услуг — заполнено только
  // одно из двух полей, второе null
  product_category: string | null;
  service_category: string | null;
  kind: CategoryKind;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Product = {
  id: number;
  product_name: string;
  product_category: Category | null;
  // DRF DecimalField сериализуется строкой ("199.99"), не числом
  price: string;
  is_available: boolean;
  image: string | null;
};

export type Service = {
  id: number;
  service_name: string;
  service_category: Category | null;
  service_price: string;
  is_available: boolean;
  image: string | null;
};

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

// Способ получения — взаимоисключающий выбор. Гравировка и предзаказ ниже —
// независимые доп.опции заказа, не связанные со способом получения
// (см. Backend/CLAUDE.md, orders.Order)
export type FulfillmentType = "pickup" | "delivery";

// Доп.услуга (гравировка, подарочная упаковка...), привязанная к конкретному
// товару ЭТОГО заказа (order.service_items[].product — id товара из
// order.product) — отдельно от services выше, которые описывают услугу как
// самостоятельную позицию заказа. price_snapshot — цена на момент оформления
// заказа, а не текущая цена услуги в каталоге (см. Backend/CLAUDE.md,
// orders.OrderServiceItem)
export type OrderServiceItem = {
  id: number;
  product: number;
  product_name: string;
  service_name: string;
  price_snapshot: string;
  details: string;
};

export type Order = {
  order_id: string;
  order_date: string;
  order_status: OrderStatus;
  user: number;
  product: Product[];
  services: Service[];
  service_items: OrderServiceItem[];
  fulfillment_type: FulfillmentType;
  // Заполнено только когда fulfillment_type === "delivery", иначе ""
  delivery_address: string;
  // preorder_date заполнено только когда preorder_requested, иначе null
  preorder_requested: boolean;
  preorder_date: string | null;
};

export type Complaint = {
  id: number;
  user: number;
  complaint_address: string;
  complaint_text: string;
  created_at: string;
};

// Messengers на бэкенде — по сути один "singleton"-объект со ссылками на
// соцсети (см. Frontend/CLAUDE.md): GET отдаёт список, берём первый элемент.
// Любое из полей может быть не заполнено
export type Messenger = {
  id: number;
  whatsapp: string | null;
  telegram: string | null;
  instagram: string | null;
  tiktok: string | null;
};
