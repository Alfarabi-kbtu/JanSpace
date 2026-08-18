from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet

router = DefaultRouter()
# первый аргумент — префикс в URL, второй — вьюха, третий — имя для reverse()
router.register("categories", CategoryViewSet, basename="category")

urlpatterns = router.urls