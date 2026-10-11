export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export function calculateLines(lines, interstate) {
  const result = lines.reduce(
    (total, line) => {
      const taxable = Math.round((Number(line.quantity || 0) * Number(line.rate || 0) + Number.EPSILON) * 100);
      const tax = Math.round((taxable * Number(line.gst_rate || 0)) / 100);
      const cgst = interstate ? 0 : Math.round(tax / 2);
      const sgst = interstate ? 0 : tax - cgst;
      return {
        taxable: total.taxable + taxable,
        cgst: total.cgst + cgst,
        sgst: total.sgst + sgst,
        igst: total.igst + (interstate ? tax : 0),
        grand: total.grand + taxable + tax,
      };
    },
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, grand: 0 },
  );
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, value / 100]));
}

export function getApiMessage(error) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data && typeof data === "object") {
    const first = Object.values(data).flat(Infinity).find((value) => typeof value === "string");
    if (first) return first;
  }
  return error?.message || "Something went wrong. Please try again.";
}
