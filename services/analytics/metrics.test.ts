import { describe, expect, it } from "vitest";
import {
  calculateGrowth,
  salesAnalyticsFiltersSchema,
  summarizeSalesRowsForTest,
} from "@/services/analytics/metrics";

const rows = [
  {
    orderDate: new Date("2025-01-15"),
    customerName: "A",
    sku: "SKU-1",
    category: "L&G",
    salesperson: "Bella Cui",
    quantity: 50,
    revenue: 500,
  },
  {
    orderDate: new Date("2026-01-10"),
    customerName: "A",
    sku: "SKU-1",
    category: "L&G",
    salesperson: "Bella Cui",
    quantity: 100,
    revenue: 1200,
  },
  {
    orderDate: new Date("2026-02-10"),
    customerName: "B",
    sku: "SKU-2",
    category: "Tube",
    salesperson: "Allen Meng",
    quantity: 150,
    revenue: 1800,
  },
];

describe("sales metrics", () => {
  it("returns null growth when denominator is zero or missing", () => {
    expect(calculateGrowth(10, 0)).toBeNull();
    expect(calculateGrowth(10, null)).toBeNull();
  });

  it("calculates growth against a non-zero previous value", () => {
    expect(calculateGrowth(150, 100)).toBe(0.5);
  });

  it("summarizes ytd, monthly, top customers, and yoy", () => {
    const summary = summarizeSalesRowsForTest(rows, { year: 2026 });

    expect(summary.kpis.ytdQuantity).toBe(250);
    expect(summary.kpis.ytdRevenue).toBe(3000);
    expect(summary.monthly).toEqual([
      expect.objectContaining({
        month: "2026-01",
        quantity: 100,
        revenue: 1200,
        yoyQuantityGrowth: 1,
      }),
      expect.objectContaining({
        month: "2026-02",
        quantity: 150,
        revenue: 1800,
        momQuantityGrowth: 0.5,
      }),
    ]);
    expect(summary.yoyComparison).toEqual([
      expect.objectContaining({
        month: "01",
        monthLabel: "Jan",
        currentYear: 2026,
        priorYear: 2025,
        currentQuantity: 100,
        priorQuantity: 50,
        quantityGrowth: 1,
      }),
      expect.objectContaining({
        month: "02",
        monthLabel: "Feb",
        currentYear: 2026,
        priorYear: 2025,
        currentQuantity: 150,
        priorQuantity: null,
        quantityGrowth: null,
      }),
    ]);
    expect(summary.topCustomers[0]).toMatchObject({ name: "B", quantity: 150 });
    expect(summary.filterOptions.salespeople).toEqual([
      "Allen Meng",
      "Bella Cui",
    ]);
  });

  it("returns null month-over-month growth when the immediate prior calendar month is missing", () => {
    const summary = summarizeSalesRowsForTest(
      [
        {
          orderDate: new Date("2026-01-10"),
          customerName: "A",
          sku: "SKU-1",
          category: "L&G",
          salesperson: "Bella Cui",
          quantity: 100,
          revenue: 1200,
        },
        {
          orderDate: new Date("2026-03-10"),
          customerName: "B",
          sku: "SKU-2",
          category: "Tube",
          salesperson: "Allen Meng",
          quantity: 150,
          revenue: 1800,
        },
      ],
      { year: 2026 },
    );

    expect(summary.monthly).toEqual([
      expect.objectContaining({
        month: "2026-01",
        momQuantityGrowth: null,
        momRevenueGrowth: null,
      }),
      expect.objectContaining({
        month: "2026-03",
        momQuantityGrowth: null,
        momRevenueGrowth: null,
      }),
    ]);
  });

  it("keeps filter options from the base loaded window after categorical filtering", () => {
    const filteredRows = rows.filter((row) => row.salesperson === "Bella Cui");
    const summary = summarizeSalesRowsForTest(filteredRows, { year: 2026 }, rows);

    expect(summary.kpis.ytdQuantity).toBe(100);
    expect(summary.filterOptions.salespeople).toEqual([
      "Allen Meng",
      "Bella Cui",
    ]);
    expect(summary.filterOptions.customers).toEqual(["A", "B"]);
    expect(summary.filterOptions.categories).toEqual(["L&G", "Tube"]);
    expect(summary.filterOptions.skus).toEqual(["SKU-1", "SKU-2"]);
  });

  it("includes January 1 rows in the selected year and applies month range filters", () => {
    const summary = summarizeSalesRowsForTest(
      [
        {
          orderDate: new Date(2026, 0, 1),
          customerName: "A",
          sku: "SKU-1",
          category: "L&G",
          salesperson: "Bella Cui",
          quantity: 25,
          revenue: 250,
        },
        {
          orderDate: new Date(2026, 1, 1),
          customerName: "B",
          sku: "SKU-2",
          category: "Tube",
          salesperson: "Allen Meng",
          quantity: 30,
          revenue: 360,
        },
        {
          orderDate: new Date(2025, 1, 1),
          customerName: "B",
          sku: "SKU-2",
          category: "Tube",
          salesperson: "Allen Meng",
          quantity: 20,
          revenue: 200,
        },
      ],
      { year: 2026, startMonth: 1, endMonth: 2 },
    );

    expect(summary.kpis.ytdQuantity).toBe(55);
    expect(summary.monthly).toEqual([
      expect.objectContaining({
        month: "2026-01",
        quantity: 25,
      }),
      expect.objectContaining({
        month: "2026-02",
        quantity: 30,
        yoyQuantityGrowth: 0.5,
      }),
    ]);
  });

  it("limits ytd totals and monthly buckets to the selected month range", () => {
    const summary = summarizeSalesRowsForTest(rows, {
      year: 2026,
      startMonth: 2,
      endMonth: 2,
    });

    expect(summary.kpis.ytdQuantity).toBe(150);
    expect(summary.kpis.ytdRevenue).toBe(1800);
    expect(summary.monthly).toEqual([
      expect.objectContaining({
        month: "2026-02",
        quantity: 150,
        revenue: 1800,
      }),
    ]);
  });

  it("rejects month ranges where start month is after end month", () => {
    expect(() =>
      salesAnalyticsFiltersSchema.parse({
        year: "2026",
        startMonth: "11",
        endMonth: "3",
      }),
    ).toThrow();
  });
});
