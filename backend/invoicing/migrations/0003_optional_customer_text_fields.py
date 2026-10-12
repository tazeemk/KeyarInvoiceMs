from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("invoicing", "0002_customer_company_invoice_pincode"),
    ]

    operations = [
        migrations.AlterField(
            model_name="customer",
            name="name",
            field=models.CharField(blank=True, max_length=180),
        ),
        migrations.AlterField(
            model_name="customer",
            name="state",
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
