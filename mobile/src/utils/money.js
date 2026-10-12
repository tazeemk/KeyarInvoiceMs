export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export function isInterstate(supplier, customer) {
  const supplierCode = supplier.state_code && supplier.state_code !== "00" ? supplier.state_code : "";
  if (supplierCode && customer.state_code) return supplierCode !== customer.state_code;
  return supplier.state.trim().toLocaleLowerCase() !== customer.state.trim().toLocaleLowerCase();
}

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
  if (error?.code === "ECONNABORTED" || /timeout/i.test(error?.message || "")) {
    return "The Keyar server is taking longer than usual to respond. Check your connection and try again.";
  }
  if (error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
    return "Could not reach the Keyar server. Check that your internet connection and mobile data are available, then try again.";
  }
  return error?.message || "Something went wrong. Please try again.";
}
