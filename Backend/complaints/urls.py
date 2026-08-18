from rest_framework.routers import DefaultRouter
from .views import ComplaintsViewSet

router = DefaultRouter()
router.register("complaints", ComplaintsViewSet, basename="complaint")

urlpatterns = router.urls