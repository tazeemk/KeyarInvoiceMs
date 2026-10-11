import { describe, expect, it } from "vitest";
import { calculateLines, money } from "./money";

describe("mobile invoice totals", () => {
  it("splits local GST per line using paise precision", () => {
    expect(calculateLines([{ quantity: "2", rate: "100", gst_rate: "12.5" }], false)).toEqual({
      taxable: 200,
      cgst: 12.5,
      sgst: 12.5,
      igst: 0,
      grand: 225,
    });
  });

  it("uses IGST for interstate supplies", () => {
    expect(calculateLines([{ quantity: 1, rate: 100, gst_rate: 18 }], true)).toEqual({
      taxable: 100,
      cgst: 0,
      sgst: 0,
      igst: 18,
      grand: 118,
    });
  });

  it("formats INR using Indian numbering", () => {
    expect(money("37465.5")).toContain("37,465.50");
  });
});
