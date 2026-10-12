import base64
import binascii
from io import BytesIO
import re
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

from .models import CompanySettings, Customer, Invoice, InvoiceCounter, InvoiceItem, Product
from .utils import amount_to_words

User = get_user_model()
CENT = Decimal("0.01")
GSTIN_PATTERN = re.compile(r"\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]")


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "name", "address", "gstin", "state", "state_code", "pincode", "mobile", "created_at")
        read_only_fields = ("id", "created_at")

    def to_internal_value(self, data):
        data = data.copy()
        for field in ("name", "address", "gstin", "state", "state_code", "pincode", "mobile"):
            if field in data and data.get(field) is None:
                data[field] = ""
        return super().to_internal_value(data)

    def validate_pincode(self, value):
        value = value.strip()
        if value and not re.fullmatch(r"\d{6}", value):
            raise serializers.ValidationError("Enter a valid six-digit PIN code.")
        return value

    def validate(self, attrs):
        state_code = attrs.get("state_code", getattr(self.instance, "state_code", ""))
        gstin = attrs.get("gstin", getattr(self.instance, "gstin", ""))
        if not state_code and GSTIN_PATTERN.fullmatch(gstin or ""):
            attrs["state_code"] = gstin[:2]
        return attrs


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"

    def validate_gst_rate(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("GST rate must be between 0 and 100.")
        return value

    def validate_default_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Default price cannot be negative.")
        return value

    def validate_hsn_code(self, value):
        if not re.fullmatch(r"\d{4,8}", value.strip()):
            raise serializers.ValidationError("Enter a numeric HSN/SAC code between 4 and 8 digits.")
        return value.strip()


class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        fields = "__all__"
        read_only_fields = ("id",)

    def validate_state_code(self, value):
        if len(value) != 2 or not value.isdigit():
            raise serializers.ValidationError("Enter a valid two-digit Indian state code.")
        return value

    def validate_pincode(self, value):
        value = value.strip()
        if value and not re.fullmatch(r"\d{6}", value):
            raise serializers.ValidationError("Enter a valid six-digit PIN code.")
        return value

    def validate(self, attrs):
        pincode = attrs.get("pincode", getattr(self.instance, "pincode", ""))
        if "pincode" in attrs and not pincode:
            raise serializers.ValidationError({"pincode": "Enter a six-digit PIN code."})
        gstin = attrs.get("gstin", getattr(self.instance, "gstin", ""))
        state_code = attrs.get("state_code", getattr(self.instance, "state_code", ""))
        if gstin and gstin != "GSTIN PENDING" and len(gstin) == 15 and state_code and gstin[:2] != state_code:
            raise serializers.ValidationError({"gstin": "The GSTIN state prefix must match the state code."})
        return attrs

    def validate_gstin(self, value):
        value = value.strip().upper()
        if value and value != "GSTIN PENDING" and not GSTIN_PATTERN.fullmatch(value):
            raise serializers.ValidationError("Enter a valid 15-character GSTIN or leave the sample placeholder.")
        return value

    def validate_logo_data(self, value):
        if not value:
            return value
        match = re.fullmatch(r"data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)", value)
        if not match:
            raise serializers.ValidationError("Upload a PNG or JPEG image.")
        try:
            image_bytes = base64.b64decode(match.group(2), validate=True)
        except (binascii.Error, ValueError):
            raise serializers.ValidationError("The selected image is invalid.")
        if not image_bytes or len(image_bytes) > 1_000_000:
            raise serializers.ValidationError("Logo images must be smaller than 1 MB.")
        expected = b"\x89PNG\r\n\x1a\n" if match.group(1) == "png" else b"\xff\xd8\xff"
        if not image_bytes.startswith(expected):
            raise serializers.ValidationError("The uploaded image content does not match its file type.")
        try:
            with Image.open(BytesIO(image_bytes)) as image:
                if image.width > 4000 or image.height > 4000:
                    raise serializers.ValidationError("Logo dimensions must not exceed 4000 × 4000 pixels.")
                image.verify()
        except (UnidentifiedImageError, OSError, ValueError):
            raise serializers.ValidationError("The selected file is not a valid image.")
        return value


class InvoiceItemInputSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(active=True))
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))
    rate = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"), required=False)
    gst_rate = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal("0"), max_value=Decimal("100"), required=False)


class InvoiceItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="product.id", read_only=True)

    class Meta:
        model = InvoiceItem
        fields = (
            "id", "product_id", "description", "hsn_code", "unit", "quantity",
            "rate", "gst_rate", "taxable_value", "cgst", "sgst", "igst", "total",
        )


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemInputSerializer(many=True, write_only=True)
    lines = InvoiceItemSerializer(source="items", many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id", "invoice_number", "invoice_date", "due_date", "customer", "customer_name",
            "customer_address", "customer_gstin", "customer_state", "customer_state_code", "customer_pincode",
            "customer_mobile", "customer_email", "supplier_name", "supplier_brand",
            "supplier_address", "supplier_gstin", "supplier_state", "supplier_state_code", "supplier_pincode",
            "supplier_phone", "supplier_email", "supplier_bank_name", "supplier_bank_account",
            "supplier_bank_ifsc", "supplier_bank_branch", "supplier_logo_data", "supplier_footer",
            "place_of_supply", "vehicle_number", "mobile_number", "notes", "taxable_total",
            "cgst_total", "sgst_total", "igst_total", "grand_total", "amount_in_words",
            "lines", "items", "created_by", "created_at",
        )
        read_only_fields = (
            "id", "invoice_number", "taxable_total", "cgst_total", "sgst_total",
            "igst_total", "grand_total", "amount_in_words", "created_by", "created_at",
            "customer_name", "customer_address", "customer_gstin", "customer_state",
            "customer_state_code", "customer_pincode", "customer_mobile", "customer_email", "supplier_name",
            "supplier_brand", "supplier_address", "supplier_gstin", "supplier_state",
            "supplier_state_code", "supplier_pincode", "supplier_phone", "supplier_email", "supplier_bank_name",
            "supplier_bank_account", "supplier_bank_ifsc", "supplier_bank_branch",
            "supplier_logo_data", "supplier_footer",
        )

    def validate(self, attrs):
        if not attrs.get("items") and not (self.instance and self.instance.items.exists()):
            raise serializers.ValidationError({"items": "Add at least one product to the invoice."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        item_data = validated_data.pop("items")
        settings = CompanySettings.objects.order_by("id").first()
        if not settings:
            raise serializers.ValidationError({"detail": "Company settings are missing."})
        customer = validated_data["customer"]
        invoice_date = validated_data.get("invoice_date", timezone.localdate())
        fiscal_year = f"{invoice_date.year}-{str(invoice_date.year + 1)[-2:]}" if invoice_date.month >= 4 else f"{invoice_date.year - 1}-{str(invoice_date.year)[-2:]}"
        counter, _ = InvoiceCounter.objects.select_for_update().get_or_create(fiscal_year=fiscal_year)
        counter.last_number += 1
        counter.save(update_fields=["last_number"])
        number = f"{settings.invoice_prefix}{fiscal_year}/{counter.last_number:04d}"
        invoice = Invoice.objects.create(
            **validated_data, invoice_number=number, created_by=self.context["request"].user,
            customer_name=customer.name, customer_address=customer.address, customer_gstin=customer.gstin,
            customer_state=customer.state, customer_state_code=customer.state_code,
            customer_pincode=customer.pincode,
            customer_mobile=customer.mobile, customer_email=customer.email,
            supplier_name=settings.company_name, supplier_brand=settings.brand_name,
            supplier_address=settings.address, supplier_gstin=settings.gstin,
            supplier_state=settings.state, supplier_state_code=settings.state_code,
            supplier_pincode=settings.pincode,
            supplier_phone=settings.phone, supplier_email=settings.email,
            supplier_bank_name=settings.bank_name, supplier_bank_account=settings.bank_account,
            supplier_bank_ifsc=settings.bank_ifsc, supplier_bank_branch=settings.bank_branch,
            supplier_logo_data=settings.logo_data, supplier_footer=settings.footer_text,
        )
        self._replace_items(invoice, item_data, settings, customer)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        item_data = validated_data.pop("items", None)
        original_customer_id = instance.customer_id
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if instance.customer_id != original_customer_id:
            customer = instance.customer
            instance.customer_name = customer.name
            instance.customer_address = customer.address
            instance.customer_gstin = customer.gstin
            instance.customer_state = customer.state
            instance.customer_state_code = customer.state_code
            instance.customer_pincode = customer.pincode
            instance.customer_mobile = customer.mobile
            instance.customer_email = customer.email
        instance.save()
        if item_data is not None:
            instance.items.all().delete()
            settings = CompanySettings.objects.order_by("id").first()
            self._replace_items(instance, item_data, settings, instance.customer)
        elif instance.customer_id != original_customer_id:
            settings = CompanySettings.objects.order_by("id").first()
            existing_items = [
                {"product": item.product, "quantity": item.quantity, "rate": item.rate, "gst_rate": item.gst_rate}
                for item in instance.items.select_related("product")
            ]
            instance.items.all().delete()
            self._replace_items(instance, existing_items, settings, instance.customer)
        return instance

    @staticmethod
    def _replace_items(invoice, item_data, company, customer):
        customer_state_code = invoice.customer_state_code or customer.state_code
        supplier_state_code = invoice.supplier_state_code or company.state_code
        if supplier_state_code and supplier_state_code != "00" and customer_state_code:
            interstate = supplier_state_code != customer_state_code
        else:
            supplier_state = invoice.supplier_state or company.state
            customer_state = invoice.customer_state or customer.state
            interstate = supplier_state.strip().casefold() != customer_state.strip().casefold()
        taxable = cgst_total = sgst_total = igst_total = Decimal("0")
        for item in item_data:
            product = item["product"]
            quantity, rate = item["quantity"], item.get("rate", product.default_price)
            gst_rate = item.get("gst_rate", product.gst_rate)
            if gst_rate is None:
                gst_rate = product.gst_rate
            gst_rate = Decimal(str(gst_rate))
            taxable_value = (quantity * rate).quantize(CENT, rounding=ROUND_HALF_UP)
            tax = (taxable_value * gst_rate / Decimal("100")).quantize(CENT, rounding=ROUND_HALF_UP)
            cgst = Decimal("0") if interstate else (tax / 2).quantize(CENT, rounding=ROUND_HALF_UP)
            sgst = Decimal("0") if interstate else tax - cgst
            igst = tax if interstate else Decimal("0")
            InvoiceItem.objects.create(
                invoice=invoice, product=product, description=product.name,
                hsn_code=product.hsn_code, unit=product.unit, quantity=quantity, rate=rate,
                gst_rate=gst_rate, taxable_value=taxable_value,
                cgst=cgst, sgst=sgst, igst=igst, total=taxable_value + tax,
            )
            taxable += taxable_value
            cgst_total += cgst
            sgst_total += sgst
            igst_total += igst
        invoice.taxable_total = taxable.quantize(CENT)
        invoice.cgst_total = cgst_total.quantize(CENT)
        invoice.sgst_total = sgst_total.quantize(CENT)
        invoice.igst_total = igst_total.quantize(CENT)
        invoice.grand_total = (taxable + cgst_total + sgst_total + igst_total).quantize(CENT)
        invoice.amount_in_words = amount_to_words(invoice.grand_total)
        invoice.place_of_supply = invoice.customer_state or customer.state
        invoice.save(update_fields=[
            "taxable_total", "cgst_total", "sgst_total", "igst_total",
            "grand_total", "amount_in_words", "place_of_supply", "updated_at",
        ])


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    role = serializers.ChoiceField(choices=("Admin", "Staff"), required=False, write_only=True)
    role_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "is_active", "role", "role_display", "password")
        read_only_fields = ("id", "role_display")

    def get_role_display(self, obj):
        return "Admin" if obj.is_staff else "Staff"

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        role = validated_data.pop("role", "Staff")
        if not password:
            raise serializers.ValidationError({"password": "A password of at least 8 characters is required."})
        user = User(**validated_data, is_staff=role == "Admin", is_superuser=False)
        try:
            validate_password(password, user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": error.messages})
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        role = validated_data.pop("role", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if role:
            instance.is_staff = role == "Admin"
            instance.is_superuser = False
        if password:
            try:
                validate_password(password, instance)
            except DjangoValidationError as error:
                raise serializers.ValidationError({"password": error.messages})
            instance.set_password(password)
        instance.save()
        return instance
