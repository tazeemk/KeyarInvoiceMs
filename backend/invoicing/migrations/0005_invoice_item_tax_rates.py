from django.db import migrations, models
from decimal import Decimal


def populate_tax_rates(apps, schema_editor):
    InvoiceItem = apps.get_model("invoicing", "InvoiceItem")
    for item in InvoiceItem.objects.select_related("invoice").iterator():
        gst_rate = item.gst_rate or Decimal("0")
        if item.invoice.igst_total > 0:
            item.igst_rate = gst_rate
            item.cgst_rate = Decimal("0")
            item.sgst_rate = Decimal("0")
        else:
            item.cgst_rate = gst_rate / Decimal("2")
            item.sgst_rate = gst_rate - item.cgst_rate
            item.igst_rate = Decimal("0")
        item.save(update_fields=["cgst_rate", "sgst_rate", "igst_rate"])


class Migration(migrations.Migration):
    dependencies = [
        ("invoicing", "0004_ke10_invoice_prefix"),
    ]

    operations = [
        migrations.AddField(
            model_name="invoiceitem",
            name="cgst_rate",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="invoiceitem",
            name="sgst_rate",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name="invoiceitem",
            name="igst_rate",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.RunPython(populate_tax_rates, migrations.RunPython.noop),
    ]
