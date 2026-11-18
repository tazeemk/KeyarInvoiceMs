export function calculateInvoice(lines, interstate) {
  const cents = lines.reduce((sum, line) => {
    const taxable = Math.round((Number(line.quantity || 0) * Number(line.rate || 0) + Number.EPSILON) * 100);
    const hasSplitRates = line.cgst_rate !== "" && line.cgst_rate != null
      || line.sgst_rate !== "" && line.sgst_rate != null
      || line.igst_rate !== "" && line.igst_rate != null;
    const cgstRate = hasSplitRates ? Number(line.cgst_rate || 0) : (interstate ? 0 : Number(line.gst_rate || 0) / 2);
    const sgstRate = hasSplitRates ? Number(line.sgst_rate || 0) : (interstate ? 0 : Number(line.gst_rate || 0) / 2);
    const igstRate = hasSplitRates ? Number(line.igst_rate || 0) : (interstate ? Number(line.gst_rate || 0) : 0);
    const cgst = Math.round(taxable * cgstRate / 100);
    const sgst = Math.round(taxable * sgstRate / 100);
    const igst = Math.round(taxable * igstRate / 100);
    const tax = cgst + sgst + igst;
    return {
      taxable: sum.taxable + taxable,
      cgst: sum.cgst + cgst,
      sgst: sum.sgst + sgst,
      igst: sum.igst + igst,
      total: sum.total + taxable + tax,
    };
  }, { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
  return Object.fromEntries(Object.entries(cents).map(([key, value]) => [key, value / 100]));
}
