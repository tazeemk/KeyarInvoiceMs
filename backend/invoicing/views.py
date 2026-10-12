from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CompanySettings, Customer, Invoice, Product
from .permissions import IsAdmin
from .serializers import (
    CompanySettingsSerializer, CustomerSerializer, InvoiceSerializer, ProductSerializer, UserSerializer,
)
from .utils import render_invoice_pdf

User = get_user_model()


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    search_fields = ["name", "gstin", "mobile", "pincode"]
    ordering_fields = ["name", "created_at"]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    search_fields = ["name", "hsn_code", "size", "colour"]
    ordering_fields = ["name", "default_price", "gst_rate"]
    def get_queryset(self):
        queryset = super().get_queryset()
        active = self.request.query_params.get("active")
        if active is not None:
            queryset = queryset.filter(active=active.lower() in ("true", "1", "yes"))
        return queryset


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("customer", "created_by").prefetch_related("items__product")
    serializer_class = InvoiceSerializer
    search_fields = ["invoice_number", "customer__name"]
    ordering_fields = ["invoice_date", "created_at", "grand_total"]
    filterset_fields = ["customer"]

    def get_queryset(self):
        queryset = super().get_queryset()
        start = self.request.query_params.get("from")
        end = self.request.query_params.get("to")
        if start:
            queryset = queryset.filter(invoice_date__gte=start)
        if end:
            queryset = queryset.filter(invoice_date__lte=end)
        return queryset

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        response = HttpResponse(render_invoice_pdf(invoice), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{invoice.invoice_number.replace("/", "-")}.pdf"'
        return response


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    search_fields = ["username", "email", "first_name", "last_name"]

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"detail": "You cannot delete your own account."})
        instance.is_active = False
        instance.save(update_fields=["is_active"])


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def company_settings(request):
    instance, _ = CompanySettings.objects.get_or_create(pk=1)
    if request.method == "GET":
        return Response(CompanySettingsSerializer(instance).data)
    if not request.user.is_staff:
        return Response({"detail": "Administrator access is required."}, status=status.HTTP_403_FORBIDDEN)
    serializer = CompanySettingsSerializer(instance, data=request.data, partial=request.method == "PATCH")
    serializer.is_valid(raise_exception=True)
    serializer.save(is_sample=False)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    return Response(UserSerializer(request.user).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    today = timezone.localdate()
    month_start = today.replace(day=1)
    invoices = Invoice.objects.all()
    month = invoices.filter(invoice_date__gte=month_start, invoice_date__lte=today)
    by_month = invoices.filter(invoice_date__year=today.year).values("invoice_date__month").annotate(total=Sum("grand_total"), count=Count("id")).order_by("invoice_date__month")
    return Response({
        "invoice_count": invoices.count(),
        "month_invoice_count": month.count(),
        "month_revenue": month.aggregate(value=Sum("grand_total"))["value"] or Decimal("0.00"),
        "total_revenue": invoices.aggregate(value=Sum("grand_total"))["value"] or Decimal("0.00"),
        "customer_count": Customer.objects.count(),
        "product_count": Product.objects.filter(active=True).count(),
        "monthly": list(by_month),
        "recent_invoices": InvoiceSerializer(invoices[:8], many=True).data,
    })
