from django.contrib import admin

from .models import CompanySettings, Customer, Invoice, InvoiceItem, Product


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    readonly_fields = ("description", "hsn_code", "quantity", "rate", "taxable_value", "cgst", "sgst", "igst", "total")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "customer_name", "invoice_date", "grand_total", "created_by")
    search_fields = ("invoice_number", "customer_name", "customer__name")
    list_filter = ("invoice_date",)
    inlines = [InvoiceItemInline]
    readonly_fields = ("invoice_number", "created_by", "created_at")


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "gstin", "state", "pincode", "mobile")
    search_fields = ("name", "gstin", "mobile")
    exclude = ("state_code",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "hsn_code", "unit", "default_price", "gst_rate", "active")
    search_fields = ("name", "hsn_code")
    list_filter = ("active", "gst_rate")


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = ("brand_name", "company_name", "state", "pincode", "is_sample")
    exclude = ("state_code",)
