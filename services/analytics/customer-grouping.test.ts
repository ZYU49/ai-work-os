import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSalesAnalytics, summarizeSalesRowsForTest } from "./metrics";
import { getProductYoYAnalytics, summarizeProductYoYRowsForTest } from "./product-yoy";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { salesRecord: { findMany } } }));

const group = "Family Farm & Home / TV";
const ffh = "FAMILY FARM & HOME, INC.";
const tv = "TV HARDWARE DISTRIBUTION LLC";
function row(year: number, month: number, customerName: string, quantity: number, sku = "SKU-A") {
  return {
    orderDate: new Date(year, month - 1, 12),
    customerName,
    sku,
    productName: "Tire",
    quantity,
    revenue: quantity * 10,
    category: "ST Radial",
    salesperson: "Allen",
    shipToState: null,
    memberName: null,
  };
}
const rows = [
  row(2025, 1, ffh, 100),
  row(2025, 5, ffh, 40),
  row(2025, 8, tv, 200),
  row(2025, 2, ffh, 7, "LOST-SKU"),
  row(2026, 1, ffh, 10),
  row(2026, 8, tv, 20),
  row(2026, 8, tv, -2),
  row(2026, 8, "Other", 50),
  row(2026, 8, "TSC-RETAILS", 2),
  row(2026, 8, "TRACTOR SUPPLY COMPANY", 3),
];

describe("FFH / TV analytical customer grouping", () => {
  beforeEach(() => findMany.mockReset());

  it("combines rankings and movement without changing raw rows or overall totals", () => {
    const original = structuredClone(rows);
    const result = summarizeSalesRowsForTest(rows, { year: 2026 });
    expect(result.kpis.ytdQuantity).toBe(83);
    expect(result.kpis.ytdRevenue).toBe(830);
    expect(result.topCustomers.find((r) => r.name === group)).toEqual({ name: group, quantity: 28, revenue: 280 });
    expect(result.filterOptions.customers).toEqual([group, "Other", "TRACTOR SUPPLY COMPANY", "TSC-RETAILS"]);
    expect(result.customerMovement.byPeriod.ytd.declining).toEqual([]);
    expect(result.customerMovement.byPeriod.ytd.summary.quantityGrowth).toBeNull();
    expect(result.customerMovement.byPeriod["08"].declining).toEqual([
      expect.objectContaining({ customerName: group, currentQuantity: 18, priorQuantity: 200, quantityDiff: -182 }),
    ]);
    expect(rows).toEqual(original);
  });

  it.each([group, ffh, tv])("selects both source names for %s in product YoY", (customerName) => {
    const result = summarizeProductYoYRowsForTest(rows, { year: 2026, customerName });
    expect(result.months).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.summary).toMatchObject({ currentQuantity: 28, priorQuantity: 347, currentRevenue: 280, priorRevenue: 3470, lineItemCount: 2 });
    expect(result.rows[0]).toMatchObject({ sku: "SKU-A", currentQuantity: 28, priorQuantity: 340 });
    expect(result.filterOptions.customers).toContain(group);
    expect(result.filterOptions.customers).not.toContain(ffh);
    expect(result.filterOptions.customers).not.toContain(tv);
  });

  it("retains the shared YTD window for customers with no current-year sales", () => {
    const data = [...rows, row(2025, 6, "Lost customer", 25)];
    const result = summarizeProductYoYRowsForTest(data, { year: 2026, customerName: "Lost customer" });
    expect(result.months).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.summary).toMatchObject({ currentQuantity: 0, priorQuantity: 25, quantityGrowth: null });
  });

  it("honors an explicit month window for both years", () => {
    const result = summarizeProductYoYRowsForTest(rows, { year: 2026, customerName: group, startMonth: 5, endMonth: 8 });
    expect(result.months).toEqual([5, 6, 7, 8]);
    expect(result.summary).toMatchObject({ currentQuantity: 18, priorQuantity: 240 });
  });

  it.each([getSalesAnalytics, getProductYoYAnalytics])("expands the grouped database filter without restricting customer options", async (getAnalytics) => {
    findMany.mockResolvedValueOnce(rows.filter((r) => [ffh, tv].includes(r.customerName))).mockResolvedValueOnce(rows);
    const result = await getAnalytics({ year: 2026, customerName: group });
    expect(findMany.mock.calls[0][0].where.customerName).toEqual({ in: [ffh, tv] });
    expect(findMany.mock.calls[1][0].where.customerName).toBeUndefined();
    expect(result.filterOptions.customers).toEqual([group, "Other", "TRACTOR SUPPLY COMPANY", "TSC-RETAILS"]);
  });
});
