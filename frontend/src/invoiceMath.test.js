import { describe, expect, it } from "vitest";
import { calculateInvoice } from "./invoiceMath";

describe("invoice tax calculations", () => {
  const lines = [{ quantity: 2, rate: 100, gst_rate: 18 }];

  it("splits intrastate GST equally between CGST and SGST", () => {
    expect(calculateInvoice(lines, false)).toEqual({
      taxable: 200, cgst: 18, sgst: 18, igst: 0, total: 236,
    });
  });

  it("charges IGST for interstate supply", () => {
    expect(calculateInvoice(lines, true)).toEqual({
      taxable: 200, cgst: 0, sgst: 0, igst: 36, total: 236,
    });
  });
});
