from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import CompanySettings, Customer, Invoice, Product
from .utils import amount_to_words


class InvoiceApiTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(username="admin", password="Strong-pass-123", is_staff=True)
        self.staff = get_user_model().objects.create_user(username="staff", password="Strong-pass-123")
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        CompanySettings.objects.create(pk=1, state="Maharashtra", state_code="27")
        self.customer = Customer.objects.create(
            name="Local Buyer", address="Buyer address", state="Maharashtra", state_code="27",
        )
        self.product = Product.objects.create(
            name="Sample Product", hsn_code="123456", unit="KGS",
            default_price=Decimal("100.00"), gst_rate=Decimal("18.00"),
        )

    def test_local_invoice_splits_gst_and_generates_number(self):
        response = self.client.post("/api/invoices/", {
            "customer": self.customer.id,
            "invoice_date": "2026-06-29",
            "items": [{"product": self.product.id, "quantity": "2", "rate": "100"}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        invoice = Invoice.objects.get(pk=response.data["id"])
        self.assertEqual(invoice.invoice_number, "KEYAR/2026-27/0001")
        self.assertEqual(invoice.taxable_total, Decimal("200.00"))
        self.assertEqual(invoice.cgst_total, Decimal("18.00"))
        self.assertEqual(invoice.sgst_total, Decimal("18.00"))
        self.assertEqual(invoice.igst_total, Decimal("0.00"))
        self.assertEqual(invoice.grand_total, Decimal("236.00"))

    def test_interstate_invoice_uses_igst(self):
        self.customer.state = "Delhi"
        self.customer.state_code = "07"
        self.customer.save()
        response = self.client.post("/api/invoices/", {
            "customer": self.customer.id,
            "invoice_date": "2026-06-29",
            "items": [{"product": self.product.id, "quantity": "1", "rate": "100"}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        invoice = Invoice.objects.get(pk=response.data["id"])
        self.assertEqual(invoice.cgst_total, Decimal("0.00"))
        self.assertEqual(invoice.sgst_total, Decimal("0.00"))
        self.assertEqual(invoice.igst_total, Decimal("18.00"))

    def test_invoice_accepts_custom_gst_rate_per_line(self):
        response = self.client.post("/api/invoices/", {
            "customer": self.customer.id,
            "invoice_date": "2026-06-29",
            "items": [{"product": self.product.id, "quantity": "2", "rate": "100", "gst_rate": "12.50"}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        invoice = Invoice.objects.get(pk=response.data["id"])
        self.assertEqual(invoice.taxable_total, Decimal("200.00"))
        self.assertEqual(invoice.cgst_total, Decimal("12.50"))
        self.assertEqual(invoice.sgst_total, Decimal("12.50"))
        self.assertEqual(invoice.grand_total, Decimal("225.00"))

    def test_invoice_pdf_download(self):
        created = self.client.post("/api/invoices/", {
            "customer": self.customer.id,
            "invoice_date": "2026-06-29",
            "items": [{"product": self.product.id, "quantity": "1", "rate": "100"}],
        }, format="json")
        response = self.client.get(f"/api/invoices/{created.data['id']}/pdf/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_users_endpoint_is_admin_only(self):
        self.assertEqual(self.client.get("/api/users/").status_code, 403)

    def test_customer_api_does_not_expose_email(self):
        response = self.client.post("/api/customers/", {
            "name": "Buyer with non-standard GSTIN",
            "gstin": "8712345678876",
            "state": "Maharashtra",
            "state_code": "91",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn("email", response.data)
        self.assertEqual(response.data["gstin"], "8712345678876")
        self.assertEqual(response.data["state_code"], "91")

    def test_admin_user_management_hashes_passwords_and_assigns_roles(self):
        self.client.force_authenticate(self.admin)
        weak = self.client.post("/api/users/", {
            "username": "newuser", "password": "password", "role": "Staff",
        }, format="json")
        self.assertEqual(weak.status_code, 400)
        response = self.client.post("/api/users/", {
            "username": "newuser", "password": "A-really-Strong-Password-987!", "role": "Staff",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        user = get_user_model().objects.get(username="newuser")
        self.assertTrue(user.check_password("A-really-Strong-Password-987!"))
        self.assertFalse(user.is_staff)

    def test_invoice_uses_customer_and_company_snapshots(self):
        response = self.client.post("/api/invoices/", {
            "customer": self.customer.id,
            "invoice_date": "2026-06-29",
            "items": [{"product": self.product.id, "quantity": "1", "rate": "100"}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.customer.name = "Changed Buyer Name"
        self.customer.save()
        self.assertEqual(self.client.get(f"/api/invoices/{response.data['id']}/").data["customer_name"], "Local Buyer")

    def test_refresh_token_can_be_reused_until_expiration(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(self.admin))
        refresh_again = self.client.post("/api/auth/token/refresh/", {"refresh": token}, format="json")
        self.assertEqual(refresh_again.status_code, 200, refresh_again.data)
        self.assertIn("access", refresh_again.data)
        self.assertNotIn("refresh", refresh_again.data)


class AmountInWordsTests(TestCase):
    def test_indian_amount_words(self):
        self.assertEqual(amount_to_words(Decimal("38999.00")), "INR Thirty Eight Thousand Nine Hundred Ninety Nine Rupees Only")
        self.assertIn("Fifty Paise", amount_to_words(Decimal("100.50")))
        self.assertEqual(amount_to_words(Decimal("10000000000.00")), "INR Ten Arab Rupees Only")
