import { describe, expect, it } from "vitest";
import {
  requiredSalesFields,
  salesFieldDefinitions,
  validateSalesMapping,
} from "@/services/analytics/fields";

describe("sales field metadata", () => {
  it("marks the five core import fields as required", () => {
    expect(requiredSalesFields).toEqual([
      "orderDate",
      "customerName",
      "sku",
      "quantity",
      "revenue",
    ]);
  });

  it("rejects mappings missing required fields", () => {
    const result = validateSalesMapping({
      orderDate: "Invoice Date",
      customerName: "Customer Name",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "SKU is required.",
        "Quantity is required.",
        "Revenue is required.",
      ],
    });
  });

  it("rejects duplicate source columns across standard fields", () => {
    const result = validateSalesMapping({
      orderDate: "Invoice Date",
      customerName: "Customer Name",
      sku: "Item",
      quantity: "Quantity",
      revenue: "Quantity",
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toContain(
      "Source column Quantity is mapped more than once.",
    );
  });

  it("exposes user-facing labels for optional fields", () => {
    expect(salesFieldDefinitions.memberName.label).toBe("Member");
    expect(salesFieldDefinitions.salesperson.label).toBe("Salesperson");
  });
});
