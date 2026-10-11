from io import BytesIO
import base64

import qrcode
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


INK = colors.HexColor("#1d2939")
BLUE = colors.HexColor("#123d57")
MUTED = colors.HexColor("#667085")
RULE = colors.HexColor("#b7c1ca")
PALE = colors.HexColor("#f1f5f7")


def _money(value):
    return f"{value:,.2f}"


def render_invoice_pdf(invoice):
    from invoicing.models import CompanySettings

    settings = CompanySettings.objects.order_by("id").first()
    company_name = invoice.supplier_name or settings.company_name
    brand_name = invoice.supplier_brand or settings.brand_name
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

    def safe(text):
        return str(text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

    def header_footer(canvas, doc):
        canvas.saveState()
        width, height = A4
        logo_data = invoice.supplier_logo_data or settings.logo_data
        if logo_data:
            logo_payload = logo_data.split(",", 1)[1]
            canvas.drawImage(
                ImageReader(BytesIO(base64.b64decode(logo_payload))),
                36, height - 59, width=96, height=40, preserveAspectRatio=True, anchor="c", mask="auto",
            )
        else:
            canvas.setFillColor(BLUE)
            canvas.setFont("Helvetica-Bold", 22)
            canvas.drawString(36, height - 43, brand_name.upper())
        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(150, height - 32, company_name)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(150, height - 43, company_address.replace("\n", " ")[:110])
        canvas.drawString(150, height - 54, f"GSTIN: {company_gstin}  |  {company_state} - {company_state_code}")
        canvas.drawRightString(width - 36, height - 36, "TAX INVOICE")
        canvas.setStrokeColor(BLUE)
        canvas.setLineWidth(1.2)
        canvas.line(36, height - 65, width - 36, height - 65)

        footer_y = 30
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.6)
        canvas.line(36, footer_y + 82, width - 36, footer_y + 82)
        qr_content = f"Keyar invoice {invoice.invoice_number} | INR {invoice.grand_total} | GSTIN {company_gstin}"
        qr = qrcode.make(qr_content)
        qr_buffer = BytesIO()
        qr.save(qr_buffer, format="PNG")
        qr_buffer.seek(0)
        canvas.drawImage(ImageReader(qr_buffer), 40, footer_y + 15, width=55, height=55, preserveAspectRatio=True, mask="auto")
        canvas.setFont("Helvetica", 6)
        canvas.setFillColor(MUTED)
        canvas.drawCentredString(67, footer_y + 8, "Invoice reference")

        canvas.setFillColor(INK)
        canvas.setFont("Helvetica-Bold", 7)
        canvas.drawString(112, footer_y + 66, "Company's Bank Details")
        canvas.setFont("Helvetica", 7)
        canvas.drawString(112, footer_y + 54, f"Bank: {bank_name}")
        canvas.drawString(112, footer_y + 42, f"A/c No.: {bank_account}")
        canvas.drawString(112, footer_y + 30, f"Branch & IFSC: {bank_branch} / {bank_ifsc}")
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
        buffer, pagesize=A4, leftMargin=36, rightMargin=36, topMargin=83,
        bottomMargin=126, title=f"Tax Invoice {invoice.invoice_number}",
        author=company_name,
    )
    story = []
    meta = [
        [Paragraph("<b>Invoice No.</b>", body), Paragraph(safe(invoice.invoice_number), body),
         Paragraph("<b>Date</b>", body), Paragraph(invoice.invoice_date.strftime("%d-%b-%Y"), body),
         Paragraph("<b>Due Date</b>", body), Paragraph(invoice.due_date.strftime("%d-%b-%Y") if invoice.due_date else "—", body)],
        [Paragraph("<b>Vehicle No.</b>", body), Paragraph(safe(invoice.vehicle_number) or "—", body),
         Paragraph("<b>Mobile</b>", body), Paragraph(safe(invoice.mobile_number or invoice.customer.mobile) or "—", body),
         Paragraph("<b>Place of Supply</b>", body), Paragraph(safe(invoice.place_of_supply), body)],
    ]
    meta_table = Table(meta, colWidths=[54, 88, 28, 65, 43, 130])
    meta_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, RULE),
        ("BACKGROUND", (0, 0), (0, -1), PALE), ("BACKGROUND", (2, 0), (2, -1), PALE),
        ("BACKGROUND", (4, 0), (4, -1), PALE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.extend([meta_table, Spacer(1, 5)])

    supplier = (
        f"<b>Supplier</b><br/><b>{safe(company_name)}</b><br/>"
        f"{safe(company_address)}<br/>GSTIN: {safe(company_gstin)}<br/>"
        f"State: {safe(company_state)} | Code: {safe(company_state_code)}<br/>"
        f"Phone: {safe(company_phone)} | {safe(company_email)}"
    )
    buyer = (
        f"<b>Bill To / Ship To</b><br/><b>{safe(customer_name)}</b><br/>"
        f"{safe(customer_address)}<br/>GSTIN: {safe(customer_gstin) or 'Unregistered'}<br/>"
        f"State: {safe(customer_state)} | Code: {safe(customer_state_code)}<br/>"
        f"Mobile: {safe(customer_mobile) or '—'}"
    )
    party_table = Table(
        [[Paragraph(supplier, body), Paragraph(buyer, body)]],
        colWidths=[261.5, 261.5],
    )
    party_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.55, RULE), ("INNERGRID", (0, 0), (-1, -1), 0.45, RULE),
        ("BACKGROUND", (0, 0), (-1, 0), colors.white), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([party_table, Spacer(1, 5)])

    headings = ["Sl.", "Description of Goods", "HSN/SAC", "GST", "Due on", "Quantity", "Rate", "Per", "Disc. %", "Amount"]
    rows = [[Paragraph(f"<b>{value}</b>", small) for value in headings]]
    invoice_items = list(invoice.items.all())
    for index, item in enumerate(invoice_items, 1):
        rows.append([
            str(index), Paragraph(safe(item.description), small), item.hsn_code,
            f"{item.gst_rate}%", invoice.due_date.strftime("%d-%b-%y") if invoice.due_date else "—",
            f"{item.quantity:,.3f}".rstrip("0").rstrip("."), _money(item.rate), item.unit,
            "—", _money(item.taxable_value),
        ])
    blank_rows = max(0, 15 - len(rows) - 1)
    for _ in range(blank_rows):
        rows.append([Paragraph("&nbsp;", small) for _ in headings])
    rows.append(["", Paragraph("<b>Taxable Total</b>", body), "", "", "", "", "", "", "", _money(invoice.taxable_total)])
    item_table = Table(rows, colWidths=[21, 124, 45, 32, 43, 45, 47, 34, 33, 99], repeatRows=1, hAlign="LEFT")
    item_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, RULE),
        ("BACKGROUND", (0, 0), (-1, 0), PALE),
        ("BACKGROUND", (0, -1), (-1, -1), PALE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
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
            [["", ""]],
            colWidths=[261.5, 261.5],
            rowHeights=[34],
            style=TableStyle([
                ("BOX", (0, 0), (-1, -1), 0.55, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, RULE),
            ]),
        ),
        Table(
            [[Paragraph("Customer's Seal &amp; Signature", small), Paragraph("Receiver's Name &amp; Signature", small)]],
            colWidths=[261.5, 261.5],
            style=TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]),
        ),
    ])
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return buffer.getvalue()
