from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("invoicing", "0005_invoice_item_tax_rates"),
    ]

    operations = [
        migrations.AddField(
            model_name="companysettings",
            name="authorised_signatory_name",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.AddField(
            model_name="companysettings",
            name="authorised_signature_data",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="invoice",
            name="authorised_signatory_name",
            field=models.CharField(blank=True, max_length=180),
        ),
        migrations.AddField(
            model_name="invoice",
            name="authorised_signature_data",
            field=models.TextField(blank=True),
        ),
    ]
