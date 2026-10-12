from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("invoicing", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="customer",
            name="state_code",
            field=models.CharField(blank=True, default="", max_length=2),
        ),
        migrations.AddField(
            model_name="customer",
            name="pincode",
            field=models.CharField(blank=True, default="", max_length=6),
        ),
        migrations.AddField(
            model_name="companysettings",
            name="pincode",
            field=models.CharField(blank=True, default="", max_length=6),
        ),
        migrations.AddField(
            model_name="invoice",
            name="customer_pincode",
            field=models.CharField(blank=True, default="", max_length=6),
        ),
        migrations.AddField(
            model_name="invoice",
            name="supplier_pincode",
            field=models.CharField(blank=True, default="", max_length=6),
        ),
    ]
