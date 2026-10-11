import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError

from invoicing.models import CompanySettings, Product


class Command(BaseCommand):
    help = "Create the clearly marked sample company, catalog, and first administrator."

    def handle(self, *args, **options):
        CompanySettings.objects.get_or_create(pk=1)
        samples = [
            ("INDOC OA 2", "20 kg", "White", "34024200", "KGS", "285.00"),
            ("Slurry", "50 kg", "White", "340290", "KGS", "50.00"),
            ("Ig Foam 5130 (50g)", "25 kg", "White", "34029199", "KGS", "92.00"),
            ("Citric Acid", "25 kg", "White", "281814", "KGS", "110.00"),
            ("Caustic Soda Flakes", "25 kg", "White", "281511", "KGS", "50.00"),
        ]
        for name, size, colour, hsn, unit, price in samples:
            Product.objects.get_or_create(
                name=name, defaults={
                    "size": size, "colour": colour, "hsn_code": hsn,
                    "unit": unit, "default_price": price, "gst_rate": "18.00",
                },
            )
        User = get_user_model()
        username = os.getenv("DJANGO_ADMIN_USERNAME", "").strip()
        password = os.getenv("DJANGO_ADMIN_PASSWORD", "")
        email = os.getenv("DJANGO_ADMIN_EMAIL", "").strip()
        if username and password and not User.objects.filter(username=username).exists():
            admin_user = User(username=username, email=email)
            try:
                validate_password(password, admin_user)
            except ValidationError as error:
                raise CommandError(f"DJANGO_ADMIN_PASSWORD does not meet password requirements: {'; '.join(error.messages)}")
            User.objects.create_superuser(username=username, password=password, email=email)
            self.stdout.write(self.style.SUCCESS(f"Created administrator '{username}'."))
        elif not username or not password:
            self.stdout.write(self.style.WARNING("Administrator not created: set DJANGO_ADMIN_USERNAME and DJANGO_ADMIN_PASSWORD."))
        self.stdout.write(self.style.SUCCESS("Sample Keyar company settings and product catalog are ready."))
