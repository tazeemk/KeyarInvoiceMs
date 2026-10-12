from io import BytesIO
import base64
from pathlib import Path

import qrcode
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


INK = colors.HexColor("#1d2939")
MUTED = colors.HexColor("#667085")
RULE = colors.HexColor("#b7c1ca")
PALE = colors.HexColor("#f1f5f7")


def _money(value):
    return f"{value:,.2f}"


def render_invoice_pdf(invoice):
    from invoicing.models import CompanySettings

    settings = CompanySettings.objects.order_by("id").first()
    company_name = invoice.supplier_name or settings.company_name
    company_address = invoice.supplier_address or settings.address
    company_gstin = invoice.supplier_gstin or settings.gstin
    company_state = invoice.supplier_state or settings.state
    company_state_code = invoice.supplier_state_code or settings.state_code
    company_phone = invoice.supplier_phone or settings.phone
    company_email = invoice.supplier_email or settings.email
    bank_name = invoice.supplier_bank_name or settings.bank_name
    bank_account = invoice.supplier_bank_account or settings.bank_account
    bank_ifsc = invoice.supplier_bank_ifsc or settings.bank_ifsc
    bank_branch = invoice.supplier_bank_branch or settings.bank_branch
    footer_text = invoice.supplier_footer or settings.footer_text
    customer_name = invoice.customer_name or invoice.customer.name
    customer_address = invoice.customer_address or invoice.customer.address
    customer_gstin = invoice.customer_gstin or invoice.customer.gstin
    customer_state = invoice.customer_state or invoice.customer.state
    customer_state_code = invoice.customer_state_code or invoice.customer.state_code
    customer_mobile = invoice.customer_mobile or invoice.customer.mobile
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    body = ParagraphStyle("InvoiceBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=INK)
    small = ParagraphStyle("InvoiceSmall", parent=body, fontSize=6.5, leading=8)
    bold = ParagraphStyle("InvoiceBold", parent=body, fontName="Helvetica-Bold")
    right = ParagraphStyle("InvoiceRight", parent=body, alignment=TA_RIGHT)
    centered = ParagraphStyle("InvoiceCentered", parent=small, alignment=TA_CENTER)
    default_logo = Path(__file__).resolve().parents[1] / "static" / "invoicing" / "keyar-logo.png"

    def safe(text):
        return str(text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

    def header_footer(canvas, doc):
        canvas.saveState()
        width, height = A4
        logo_data = invoice.supplier_logo_data or settings.logo_data
        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawCentredString(width / 2, height - 30, "TAX INVOICE")
        canvas.setFont("Helvetica", 6.5)
        canvas.drawCentredString(width / 2, height - 41, "ORIGINAL FOR RECIPIENT")
        if logo_data:
            logo_payload = logo_data.split(",", 1)[1]
            canvas.drawImage(
                ImageReader(BytesIO(base64.b64decode(logo_payload))),
                36, height - 111, width=145, height=72, preserveAspectRatio=True, anchor="c", mask="auto",
            )
        else:
            canvas.drawImage(
                ImageReader(str(default_logo)),
                36, height - 111, width=145, height=72, preserveAspectRatio=True, anchor="c", mask="auto",
            )
        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(190, height - 61, company_name)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(190, height - 73, company_address.replace("\n", " ")[:100])
        canvas.drawString(190, height - 85, f"GSTIN: {company_gstin}  |  {company_state} - {company_state_code}")
        canvas.drawString(190, height - 97, f"Phone: {company_phone}  |  {company_email}")
        qr_content = f"Keyar invoice {invoice.invoice_number} | INR {invoice.grand_total} | GSTIN {company_gstin}"
        qr = qrcode.make(qr_content)
        qr_buffer = BytesIO()
        qr.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)
        canvas.drawImage(ImageReader(qr_buffer), width - 92, height - 108, width=56, height=56, mask="auto")
        canvas.setFont("Helvetica", 6)
        canvas.setFillColor(MUTED)
        canvas.drawCentredString(width - 64, height - 116, "Invoice reference")
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.7)
        canvas.line(36, height - 126, width - 36, height - 126)

        footer_y = 30
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.6)
        canvas.line(36, footer_y + 82, width - 36, footer_y + 82)
        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 7)
        canvas.drawString(40, footer_y + 66, "Company's Bank Details")
        canvas.setFont("Helvetica", 7)
        canvas.drawString(40, footer_y + 54, f"Bank: {bank_name}")
        canvas.drawString(40, footer_y + 42, f"A/c No.: {bank_account}")
        canvas.drawString(40, footer_y + 30, f"Branch & IFSC: {bank_branch} / {bank_ifsc}")
        canvas.setFont("Helvetica-Bold", 7)
        canvas.drawRightString(width - 42, footer_y + 66, f"For {company_name}")
        canvas.setStrokeColor(RULE)
        canvas.rect(width - 168, footer_y + 15, 126, 38, stroke=1, fill=0)
        canvas.setFont("Helvetica", 7)
        canvas.drawRightString(width - 47, footer_y + 7, "Authorised Signatory")
        canvas.setFont("Helvetica", 6.5)
        canvas.setFillColor(MUTED)
        canvas.drawCentredString(width / 2, 17, footer_text)
        canvas.drawRightString(width - 36, 17, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4, leftMargin=36, rightMargin=36, topMargin=139,
        bottomMargin=126, title=f"Tax Invoice {invoice.invoice_number}",
        author=company_name,
    )
    story = []
    supplier = (
        f"<b>Supplier (Despatch From)</b><br/><b>{safe(company_name)}</b><br/>"
        f"{safe(company_address)}<br/>GSTIN: {safe(company_gstin)}<br/>"
        f"State: {safe(company_state)} | Code: {safe(company_state_code)}<br/>"
        f"Phone: {safe(company_phone)}"
    )
    buyer = (
        f"<b>Buyer (Bill To / Ship To)</b><br/><b>{safe(customer_name)}</b><br/>"
        f"{safe(customer_address)}<br/>GSTIN: {safe(customer_gstin) or 'Unregistered'}<br/>"
        f"State: {safe(customer_state)} | Code: {safe(customer_state_code)}<br/>"
        f"Mobile: {safe(customer_mobile) or '—'}"
    )
    parties = Table(
        [[Paragraph(supplier, body)], [Paragraph(buyer, body)]],
        colWidths=[323],
    )
    parties.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.55, RULE), ("INNERGRID", (0, 0), (-1, -1), 0.45, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    metadata = [
        ["Invoice No.", safe(invoice.invoice_number)],
        ["Date", invoice.invoice_date.strftime("%d-%b-%Y")],
        ["Due Date", invoice.due_date.strftime("%d-%b-%Y") if invoice.due_date else "—"],
        ["Vehicle No.", safe(invoice.vehicle_number) or "—"],
        ["Mobile", safe(invoice.mobile_number or customer_mobile) or "—"],
        ["Place of Supply", safe(invoice.place_of_supply or customer_state)],
    ]
    metadata_table = Table(
        [[Paragraph(f"<b>{label}</b>", small), Paragraph(value, small)] for label, value in metadata],
        colWidths=[70, 130],
    )
    metadata_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, RULE),
        ("BACKGROUND", (0, 0), (0, -1), PALE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    details = Table([[parties, metadata_table]], colWidths=[323, 200], hAlign="LEFT")
    details.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.extend([details, Spacer(1, 5)])

    headings = ["Sl.", "Description of Goods", "HSN/SAC", "Quantity", "Rate", "Per", "GST %", "Amount"]
    rows = [[Paragraph(f"<b>{value}</b>", small) for value in headings]]
    invoice_items = list(invoice.items.all())
    for index, item in enumerate(invoice_items, 1):
        rows.append([
            str(index), Paragraph(safe(item.description), small), item.hsn_code,
            f"{item.quantity:,.3f}".rstrip("0").rstrip("."), _money(item.rate), item.unit,
            f"{item.gst_rate}%", _money(item.taxable_value),
        ])
    blank_rows = max(0, 12 - len(invoice_items))
    for _ in range(blank_rows):
        rows.append([Paragraph("&nbsp;", small) for _ in headings])
    rows.append(["", Paragraph("<b>Taxable Total</b>", body), "", "", "", "", "", _money(invoice.taxable_total)])
    item_table = Table(rows, colWidths=[24, 139, 48, 47, 53, 36, 49, 127], repeatRows=1, hAlign="LEFT")
    item_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, RULE),
        ("BACKGROUND", (0, 0), (-1, 0), PALE),
        ("BACKGROUND", (0, -1), (-1, -1), PALE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (3, 1), (4, -1), "RIGHT"),
        ("ALIGN", (5, 1), (5, -1), "CENTER"),
        ("ALIGN", (6, 1), (-1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([item_table, Spacer(1, 5)])

    tax_rows = [
        [Paragraph("<b>Taxable Value</b>", body), Paragraph("<b>CGST</b>", body), Paragraph("<b>SGST</b>", body),
         Paragraph("<b>IGST</b>", body), Paragraph("<b>Grand Total</b>", body)],
        [_money(invoice.taxable_total), _money(invoice.cgst_total), _money(invoice.sgst_total),
         _money(invoice.igst_total), Paragraph(f"<b>INR {_money(invoice.grand_total)}</b>", right)],
    ]
    tax_table = Table(tax_rows, colWidths=[104.6] * 5)
    tax_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.55, RULE), ("INNERGRID", (0, 0), (-1, -1), 0.45, RULE),
        ("BACKGROUND", (0, 0), (-1, 0), PALE), ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([
        tax_table, Spacer(1, 5),
        Paragraph(f"<b>Amount Chargeable (in words):</b> {safe(invoice.amount_in_words)}", body),
    ])
    if invoice.notes:
        story.extend([Spacer(1, 3), Paragraph(f"<b>Notes:</b> {safe(invoice.notes)}", body)])
    story.extend([
        Spacer(1, 8),
        Table(
            [["", ""], [
                Paragraph("Customer's Seal &amp; Signature", centered),
                Paragraph("Authorised Signatory", centered),
            ]],
            colWidths=[261.5, 261.5],
            rowHeights=[36, 18],
            style=TableStyle([
                ("BOX", (0, 0), (-1, -1), 0.55, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, RULE),
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]),
        ),
    ])
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return buffer.getvalue()
