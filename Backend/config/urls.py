from django.contrib import admin
from django.urls import path, include
from accounts.views import ThrottledTokenObtainPairView   # ⬅ наш собственный класс
from rest_framework_simplejwt.views import TokenRefreshView   # ⬅ это остаётся из библиотеки
from config.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health_check"),

    # логин: отправляем username+password, получаем access + refresh токены
    path("api/token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    # обновление access-токена по refresh-токену (когда access протух)
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # каждое приложение подключается под своим префиксом /api/...
    path("api/", include("accounts.urls")),
    path("api/", include("categories.urls")),
    path("api/", include("products.urls")),
    path("api/", include("services.urls")),
    path("api/", include("orders.urls")),
    path("api/", include("complaints.urls")),
    path("api/", include("messengers.urls")),
]