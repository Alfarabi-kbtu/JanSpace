// Типы под контракт бэкенда (см. Frontend/CLAUDE.md, разделы "REST-ресурсы"
// и "Известные особенности бэкенда")

export type Category = {
  id: number;
  // Category используется и для товаров, и для услуг — заполнено только
  // одно из двух полей, второе null
  product_category: string | null;
  service_category: string | null;
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

export type Order = {
  order_id: string;
  order_date: string;
  order_status: OrderStatus;
  user: number;
  product: Product[];
  services: Service[];
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
