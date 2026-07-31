import { describe, expect, it } from "vitest";
import { summarizeProductYoYRowsForTest } from "@/services/analytics/product-yoy";

const rows = [
  {
    orderDate: new Date("2025-01-12"),
    sku: "SKU-A",
    productName: "Alpha tire",
    quantity: 60,
  },
  {
    orderDate: new Date("2025-02-12"),
    sku: "SKU-A",
    productName: "Alpha tire",
    quantity: 20,
  },
  {
    orderDate: new Date("2025-03-12"),
    sku: "SKU-A",
    productName: "Alpha tire",
    quantity: 999,
  },
  {
    orderDate: new Date("2025-01-15"),
    sku: "SKU-C",
    productName: "Charlie tire",
    quantity: 80,
  },
  {
    orderDate: new Date("2026-01-10"),
    sku: "SKU-A",
    productName: "Alpha tire updated",
    quantity: 100,
  },
  {
    orderDate: new Date("2026-02-10"),
    sku: "SKU-B",
    productName: "Bravo tire",
    quantity: 50,
  },
];

describe("product YoY analytics", () => {
  it("compares each SKU against matching prior-year months and sorts by current-year quantity", () => {
    const summary = summarizeProductYoYRowsForTest(rows, { year: 2026 });

    expect(summary.currentYear).toBe(2026);
    expect(summary.priorYear).toBe(2025);
    expect(summary.months).toEqual([1, 2]);
    expect(summary.rows).toEqual([
      {
        sku: "SKU-A",
        description: "Alpha tire updated",
        currentQuantity: 100,
        priorQuantity: 80,
        quantityDiff: 20,
        quantityGrowth: 0.25,
      },
      {
        sku: "SKU-B",
        description: "Bravo tire",
        currentQuantity: 50,
        priorQuantity: 0,
        quantityDiff: 50,
        quantityGrowth: null,
      },
      {
        sku: "SKU-C",
        description: "Charlie tire",
        currentQuantity: 0,
        priorQuantity: 80,
        quantityDiff: -80,
        quantityGrowth: -1,
      },
    ]);
  });
});
