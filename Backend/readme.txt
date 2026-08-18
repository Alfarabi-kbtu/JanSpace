Backend --> Django RF:
Roles:
	User --> Log in/Sign in
		 Make order
		 Access to history of orders
		 Complaints
		 fields: email(EmailField), last_name, first_name(CharField), number(Varchar), id(UUID)
		 See services, price list info
	Admin --> See/Delete user
		  Check User info, orders
		  See/Check/Delete order history
		  See/Check/Delete complaints
		  See/Create/Delete/Upgrade services, price list info
		  fields: email(EmailField), last_name, first_name(CharField), number(Varchar), is_staff(Boolean), is_active(Boolean)
Models: 
	Product --> fields: product_name(CharField), product_category(ForeignKey-Category, CharField), price(DecimalField), is_available(Boolean), id(AutoField) 
	Category --> fields: product_category(CharField), service_category(CharField), id(PrimaryKey, AutoField)
	Order --> order_id(PrimaryKey, UUID), order_date(DateTimeField), order_status(Charfield), user(ForeignKey, User), product(ManyToManyField "Product"), services(ManyToManyField "Services")
	Complaints --> user (ForeignKey, "User")complaint_address(EmailField), complaint_text(TextField)
	Services --> service_name(CharField), service_category(ForeignKey-Category, CharField), service_price(DecimalField), is_available(Boolean), id`(AutoField)
	Messengers --> whatsapp(URLField), telegram(URLField), instagram(URLField), tiktok(URLField)
	
import uuid
from django.db import models
from django.contrib.auth.models import User


# =========================================================
# CATEGORY
# =========================================================
# Категория используется и для товаров (Product), и для услуг (Services).
# Поэтому в ней два отдельных поля-названия: одно для товарной категории,
# второе — для категории услуг. Если вам нужна ОДНА общая категория —
# скажите, упростим до одного поля "name".
class Category(models.Model):
    id = models.AutoField(primary_key=True)

    product_category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Название категории для товаров (например: 'Электроника')"
    )
    service_category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Название категории для услуг (например: 'Ремонт')"
    )

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        # Показываем то поле, которое заполнено
        return self.product_category or self.service_category or f"Category #{self.id}"


# =========================================================
# PRODUCT
# =========================================================
class Product(models.Model):
    id = models.AutoField(primary_key=True)

    product_name = models.CharField(max_length=255)

    # ForeignKey на Category (в вводных было указано "ForeignKey-Category, CharField" —
    # трактую как: связь с Category через FK, а название категории берётся из
    # Category.product_category)
    product_category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,   # если категория удалится, товар не удаляем, просто снимаем связь
        null=True,
        blank=True,
        related_name="products"
    )

    price = models.DecimalField(max_digits=10, decimal_places=2)

    is_available = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return self.product_name


# =========================================================
# SERVICES
# =========================================================
class Services(models.Model):
    id = models.AutoField(primary_key=True)

    service_name = models.CharField(max_length=255)

    # Аналогично Product: FK на Category
    service_category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="services"
    )

    service_price = models.DecimalField(max_digits=10, decimal_places=2)

    is_available = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Service"
        verbose_name_plural = "Services"

    def __str__(self):
        return self.service_name


# =========================================================
# ORDER
# =========================================================
class Order(models.Model):
    # Статусы заказа. Используем choices, чтобы избежать "опечаток" в статусах
    # и чтобы DRF мог валидировать значение автоматически.
    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    order_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,   # UUID генерируется автоматически при создании
        editable=False
    )

    order_date = models.DateTimeField(auto_now_add=True)  # проставляется автоматически при создании заказа

    order_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,   # если пользователь удалён — его заказы тоже удаляем
        related_name="orders"
    )

    # ManyToMany: один заказ может содержать много товаров,
    # и один товар может быть в нескольких заказах
    product = models.ManyToManyField(
        Product,
        related_name="orders",
        blank=True
    )

    # ManyToMany для услуг — аналогично товарам
    services = models.ManyToManyField(
        Services,
        related_name="orders",
        blank=True
    )

    class Meta:
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ["-order_date"]   # новые заказы показываются первыми

    def __str__(self):
        return f"Order {self.order_id} ({self.order_status})"


# =========================================================
# COMPLAINTS
# =========================================================
class Complaints(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="complaints"
    )

    complaint_address = models.EmailField(
        help_text="Email, на который нужно ответить по жалобе"
    )

    complaint_text = models.TextField()

    # Небольшое дополнение (не было в вводных, но полезно) —
    # дата создания жалобы. Если не нужно — просто удалите это поле.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Complaint"
        verbose_name_plural = "Complaints"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Complaint from {self.user} ({self.complaint_address})"


# =========================================================
# MESSENGERS
# =========================================================
# Обычно это singleton-таблица (одна запись с контактами компании),
# но модель написана так, что можно хранить и несколько наборов ссылок,
# если понадобится (например, для разных филиалов).
class Messengers(models.Model):
    whatsapp = models.URLField(blank=True, null=True)
    telegram = models.URLField(blank=True, null=True)
    instagram = models.URLField(blank=True, null=True)
    tiktok = models.URLField(blank=True, null=True)

    class Meta:
        verbose_name = "Messenger links"
        verbose_name_plural = "Messenger links"

    def __str__(self):
        return "Messenger links"
	
	