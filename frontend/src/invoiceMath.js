export function calculateInvoice(lines, interstate) {
  const cents = lines.reduce((sum, line) => {
    const taxable = Math.round((Number(line.quantity || 0) * Number(line.rate || 0) + Number.EPSILON) * 100);
    const tax = Math.round(taxable * Number(line.gst_rate || 0) / 100);
    const cgst = interstate ? 0 : Math.round(tax / 2);
    const sgst = interstate ? 0 : tax - cgst;
    return {
      taxable: sum.taxable + taxable,
      cgst: sum.cgst + cgst,
      sgst: sum.sgst + sgst,
      igst: sum.igst + (interstate ? tax : 0),
      total: sum.total + taxable + tax,
    };
  }, { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
  return Object.fromEntries(Object.entries(cents).map(([key, value]) => [key, value / 100]));
}
