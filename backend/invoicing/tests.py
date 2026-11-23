from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import CompanySettings, Customer, Invoice, Product
from .utils import amount_to_words


class InvoiceApiTests(TestCase):
    SIGNATURE_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAC0lEQVR4nGNgQAcAABIAAXfx+gAAAAAASUVORK5CYII="

    def setUp(self):
        self.admin = get_user_model().objects.create_user(username="admin", password="Strong-pass-123", is_staff=True)
        self.staff = get_user_model().objects.create_user(username="staff", password="Strong-pass-123")
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        CompanySettings.objects.create(pk=1, state="Maharashtra", state_code="27", pincode="400001")
        self.customer = Customer.objects.create(
            name="Local Buyer", address="Buyer address", state="Maharashtra", state_code="27", pincode="400001",
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
        self.assertEqual(invoice.invoice_number, "KE10/2026-27/0001")
        self.assertEqual(invoice.taxable_total, Decimal("200.00"))
        self.assertEqual(invoice.cgst_total, Decimal("18.00"))
        self.assertEqual(invoice.sgst_total, Decimal("18.00"))
        self.assertEqual(invoice.igst_total, Decimal("0.00"))
        self.assertEqual(invoice.grand_total, Decimal("236.00"))
        self.assertEqual(invoice.customer_pincode, "400001")
        self.assertEqual(invoice.supplier_pincode, "400001")
        self.assertEqual(response.data["customer_pincode"], "400001")
        self.assertEqual(response.data["supplier_pincode"], "400001")

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

    def test_invoice_accepts_separate_cgst_sgst_and_igst_rates(self):
        response = self.client.post("/api/invoices/", {
            "customer": self.customer.id,
            "invoice_date": "2026-06-29",
            "items": [{
                "product": self.product.id, "quantity": "5", "rate": "100",
                "cgst_rate": "10", "sgst_rate": "5", "igst_rate": "0",
            }],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        invoice = Invoice.objects.get(pk=response.data["id"])
        self.assertEqual(invoice.taxable_total, Decimal("500.00"))
        self.assertEqual(invoice.cgst_total, Decimal("50.00"))
        self.assertEqual(invoice.sgst_total, Decimal("25.00"))
        self.assertEqual(invoice.igst_total, Decimal("0.00"))
        self.assertEqual(invoice.grand_total, Decimal("575.00"))

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
            "pincode": "012345",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn("email", response.data)
        self.assertEqual(response.data["gstin"], "8712345678876")
        self.assertEqual(response.data["pincode"], "012345")
        self.assertEqual(response.data["state_code"], "")

    def test_customer_optional_fields_accept_blank_and_null(self):
        response = self.client.post("/api/customers/", {
            "name": "",
            "address": None,
            "gstin": "",
            "state": None,
            "state_code": "",
            "pincode": "",
            "mobile": None,
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        customer = Customer.objects.get(pk=response.data["id"])
        self.assertEqual(customer.name, "")
        self.assertEqual(customer.address, "")
        self.assertEqual(customer.state, "")
        self.assertEqual(customer.pincode, "")

    def test_customer_rejects_invalid_nonempty_pincode(self):
        response = self.client.post("/api/customers/", {
            "name": "Buyer with invalid PIN",
            "state": "Maharashtra",
            "pincode": "12345",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("pincode", response.data)

    def test_customer_partial_update_preserves_omitted_fields(self):
        response = self.client.patch(
            f"/api/customers/{self.customer.id}/",
            {"mobile": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.name, "Local Buyer")
        self.assertEqual(self.customer.state, "Maharashtra")
        self.assertEqual(self.customer.pincode, "400001")

    def test_company_settings_requires_six_digit_pincode(self):
        self.client.force_authenticate(self.admin)
        invalid = self.client.patch("/api/settings/", {"pincode": "12345"}, format="json")
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("pincode", invalid.data)
        valid = self.client.patch("/api/settings/", {"pincode": "123456"}, format="json")
        self.assertEqual(valid.status_code, 200, valid.data)

    def test_company_gstin_validates_format_without_matching_state_prefix(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch("/api/settings/", {"gstin": "071234567890123"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("gstin", response.data)
        valid_different_prefix = "07ABCDE1234F1Z5"
        response = self.client.patch("/api/settings/", {"gstin": valid_different_prefix}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["gstin"], valid_different_prefix)

    def test_new_invoice_snapshots_company_signatory_and_signature(self):
        company = CompanySettings.objects.get(pk=1)
        company.authorised_signatory_name = "Saved Signatory"
        company.authorised_signature_data = self.SIGNATURE_DATA
        company.save()
        response = self.client.post("/api/invoices/", {
            "customer": self.customer.id,
            "invoice_date": "2026-06-29",
            "authorised_signatory_name": "Invoice Override",
            "authorised_signature_data": self.SIGNATURE_DATA,
            "items": [{"product": self.product.id, "quantity": "1", "rate": "100"}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        invoice = Invoice.objects.get(pk=response.data["id"])
        self.assertEqual(invoice.authorised_signatory_name, "Saved Signatory")
        self.assertEqual(invoice.authorised_signature_data, self.SIGNATURE_DATA)

    def test_company_signature_settings_round_trip_and_invoice_preserves_snapshot(self):
        self.client.force_authenticate(self.admin)
        settings_data = {
            "authorised_signatory_name": "Saved Signatory",
            "authorised_signature_data": self.SIGNATURE_DATA,
        }
        response = self.client.patch("/api/settings/", settings_data, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.client.get("/api/settings/").data["authorised_signature_data"], settings_data["authorised_signature_data"])
        self.client.force_authenticate(self.staff)
        created = self.client.post("/api/invoices/", {
            "customer": self.customer.id, "invoice_date": "2026-06-29",
            "items": [{"product": self.product.id, "quantity": "1", "rate": "100"}],
        }, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        invoice = Invoice.objects.get(pk=created.data["id"])
        self.assertEqual(invoice.authorised_signatory_name, "Saved Signatory")
        self.assertEqual(invoice.authorised_signature_data, settings_data["authorised_signature_data"])
        self.client.force_authenticate(self.admin)
        self.client.patch("/api/settings/", {"authorised_signature_data": ""}, format="json")
        invoice.refresh_from_db()
        self.assertEqual(invoice.authorised_signature_data, settings_data["authorised_signature_data"])
        pdf = self.client.get(f"/api/invoices/{invoice.id}/pdf/")
        self.assertEqual(pdf.status_code, 200)
        self.assertIn(b"/Subtype /Image", pdf.content)

    def test_customer_without_state_code_uses_state_name_for_tax(self):
        self.customer.state_code = ""
        self.customer.save()
        response = self.client.post("/api/invoices/", {
            "customer": self.customer.id,
            "invoice_date": "2026-06-29",
            "items": [{"product": self.product.id, "quantity": "1", "rate": "100"}],
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        invoice = Invoice.objects.get(pk=response.data["id"])
        self.assertEqual(invoice.cgst_total, Decimal("9.00"))
        self.assertEqual(invoice.sgst_total, Decimal("9.00"))
        self.assertEqual(invoice.igst_total, Decimal("0.00"))

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

    def test_invoice_created_for_customer_with_blank_optional_fields_is_listed_and_retrievable(self):
        customer_response = self.client.post("/api/customers/", {
            "name": None,
            "state": "",
            "pincode": "",
        }, format="json")
        self.assertEqual(customer_response.status_code, 201, customer_response.data)

        created = self.client.post("/api/invoices/", {
            "customer": customer_response.data["id"],
            "invoice_date": "2026-06-29",
            "items": [{"product": self.product.id, "quantity": "1", "rate": "100"}],
        }, format="json")
        self.assertEqual(created.status_code, 201, created.data)

        details = self.client.get(f"/api/invoices/{created.data['id']}/")
        self.assertEqual(details.status_code, 200, details.data)
        self.assertEqual(details.data["invoice_number"], created.data["invoice_number"])
        self.assertEqual(details.data["lines"][0]["description"], self.product.name)

        listed = self.client.get("/api/invoices/")
        self.assertEqual(listed.status_code, 200)
        listed_rows = listed.data.get("results", listed.data)
        self.assertTrue(any(row["id"] == created.data["id"] for row in listed_rows))

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
