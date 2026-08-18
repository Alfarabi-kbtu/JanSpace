from rest_framework.routers import DefaultRouter
from .views import ServicesViewSet

router = DefaultRouter()
router.register("services", ServicesViewSet, basename="service")

urlpatterns = router.urls