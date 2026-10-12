import { describe, expect, it } from "vitest";
import { PRODUCTION_API_URL, resolveApiBaseUrl } from "./config";

describe("mobile API configuration", () => {
  it("defaults standalone APKs to the production Render API", () => {
    expect(resolveApiBaseUrl()).toBe(PRODUCTION_API_URL);
  });

  it("uses the Expo app configuration when no environment override is set", () => {
    expect(resolveApiBaseUrl(undefined, "https://api.example.com/api")).toBe("https://api.example.com/api/");
  });

  it("normalizes explicit development API overrides", () => {
    expect(resolveApiBaseUrl("http://10.0.2.2:8000/api///")).toBe("http://10.0.2.2:8000/api/");
  });
});
