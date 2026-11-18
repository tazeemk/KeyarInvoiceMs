from django.db import migrations, models


def set_ke10_prefix(apps, schema_editor):
    CompanySettings = apps.get_model("invoicing", "CompanySettings")
    CompanySettings.objects.filter(invoice_prefix="KEYAR/").update(invoice_prefix="KE10/")


def restore_keyar_prefix(apps, schema_editor):
    CompanySettings = apps.get_model("invoicing", "CompanySettings")
    CompanySettings.objects.filter(invoice_prefix="KE10/").update(invoice_prefix="KEYAR/")


class Migration(migrations.Migration):
    dependencies = [
        ("invoicing", "0003_optional_customer_text_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="companysettings",
            name="invoice_prefix",
            field=models.CharField(default="KE10/", max_length=20),
        ),
        migrations.RunPython(set_ke10_prefix, restore_keyar_prefix),
    ]
