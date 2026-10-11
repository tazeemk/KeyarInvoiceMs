from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CustomerViewSet, InvoiceViewSet, ProductViewSet, UserViewSet,
    company_settings, current_user, dashboard_summary,
)

router = DefaultRouter()
router.register("customers", CustomerViewSet)
router.register("products", ProductViewSet)
router.register("invoices", InvoiceViewSet)
router.register("users", UserViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("auth/me/", current_user, name="current_user"),
    path("settings/", company_settings, name="company_settings"),
    path("dashboard/summary/", dashboard_summary, name="dashboard_summary"),
]
