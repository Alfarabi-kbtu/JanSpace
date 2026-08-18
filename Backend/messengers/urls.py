from rest_framework.routers import DefaultRouter
from .views import MessengersViewSet

router = DefaultRouter()
router.register("messengers", MessengersViewSet, basename="messenger")

urlpatterns = router.urls