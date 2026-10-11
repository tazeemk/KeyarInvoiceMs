from decimal import Decimal

from django.conf import settings
from django.db import models


class Customer(models.Model):
    name = models.CharField(max_length=180)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=15, blank=True)
    state = models.CharField(max_length=100)
    state_code = models.CharField(max_length=2)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=180)
    size = models.CharField(max_length=100, blank=True)
    colour = models.CharField(max_length=100, blank=True)
    hsn_code = models.CharField(max_length=20)
    unit = models.CharField(max_length=20, default="PCS")
    default_price = models.DecimalField(max_digits=12, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("18.00"))
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CompanySettings(models.Model):
    company_name = models.CharField(max_length=180, default="Namaste SS International Pvt. Ltd.")
    brand_name = models.CharField(max_length=80, default="Keyar")
    address = models.TextField(default="SAMPLE ADDRESS - update in Settings before issuing invoices")
    gstin = models.CharField(max_length=15, blank=True, default="GSTIN PENDING")
    state = models.CharField(max_length=100, default="State to be verified")
    state_code = models.CharField(max_length=2, default="00")
    phone = models.CharField(max_length=30, blank=True, default="Contact details to be verified")
    email = models.EmailField(blank=True, default="accounts@example.invalid")
    logo_data = models.TextField(blank=True)
    bank_name = models.CharField(max_length=120, blank=True, default="Bank details to be verified")
    bank_account = models.CharField(max_length=80, blank=True, default="Account number to be verified")
    bank_ifsc = models.CharField(max_length=20, blank=True, default="IFSC to be verified")
    bank_branch = models.CharField(max_length=120, blank=True, default="Branch to be verified")
    invoice_prefix = models.CharField(max_length=20, default="KEYAR/")
    footer_text = models.CharField(max_length=240, default="This is a computer generated document.")
    is_sample = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.brand_name} company settings"


class InvoiceCounter(models.Model):
    fiscal_year = models.CharField(max_length=9, unique=True)
    last_number = models.PositiveIntegerField(default=0)


class Invoice(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="invoices")
    customer_name = models.CharField(max_length=180, blank=True)
    customer_address = models.TextField(blank=True)
    customer_gstin = models.CharField(max_length=15, blank=True)
    customer_state = models.CharField(max_length=100, blank=True)
    customer_state_code = models.CharField(max_length=2, blank=True)
    customer_mobile = models.CharField(max_length=20, blank=True)
    customer_email = models.EmailField(blank=True)
    invoice_number = models.CharField(max_length=40, unique=True)
    supplier_name = models.CharField(max_length=180, blank=True)
    supplier_brand = models.CharField(max_length=80, blank=True)
    supplier_address = models.TextField(blank=True)
    supplier_gstin = models.CharField(max_length=15, blank=True)
    supplier_state = models.CharField(max_length=100, blank=True)
    supplier_state_code = models.CharField(max_length=2, blank=True)
    supplier_phone = models.CharField(max_length=30, blank=True)
    supplier_email = models.EmailField(blank=True)
    supplier_bank_name = models.CharField(max_length=120, blank=True)
    supplier_bank_account = models.CharField(max_length=80, blank=True)
    supplier_bank_ifsc = models.CharField(max_length=20, blank=True)
    supplier_bank_branch = models.CharField(max_length=120, blank=True)
    supplier_logo_data = models.TextField(blank=True)
    supplier_footer = models.CharField(max_length=240, blank=True)
    invoice_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    place_of_supply = models.CharField(max_length=100, blank=True)
    vehicle_number = models.CharField(max_length=40, blank=True)
    mobile_number = models.CharField(max_length=20, blank=True)
    notes = models.CharField(max_length=500, blank=True)
    taxable_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cgst_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sgst_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    igst_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_in_words = models.CharField(max_length=300, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="invoices")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-invoice_date", "-id"]

    def __str__(self):
        return self.invoice_number


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="invoice_items")
    description = models.CharField(max_length=180)
    hsn_code = models.CharField(max_length=20)
    unit = models.CharField(max_length=20)
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    taxable_value = models.DecimalField(max_digits=14, decimal_places=2)
    cgst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        ordering = ["id"]
