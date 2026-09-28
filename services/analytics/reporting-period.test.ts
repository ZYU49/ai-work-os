import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSalesAnalytics, summarizeSalesRowsForTest } from "./metrics";
import { getProductYoYAnalytics, summarizeProductYoYRowsForTest } from "./product-yoy";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { salesRecord: { findMany } } }));

function row(year: number, month: number, quantity = 10, customerName = "A", sku = "SKU") {
  return {
    orderDate: new Date(year, month - 1, 12), customerName, sku,
    productName: "Tire", category: "Tire", salesperson: "Allen",
    shipToState: null, memberName: null, quantity, revenue: quantity * 10,
  };
}

describe("shared sales reporting period", () => {
  beforeEach(() => findMany.mockReset());

  it.each([summarizeSalesRowsForTest, summarizeProductYoYRowsForTest])(
    "uses global current-year availability, not filtered sales or prior December",
    (summarize) => {
      const globalRows = [row(2025, 1), row(2025, 12), row(2026, 1), row(2026, 3, 10, "B")];
      const result = summarize(globalRows.filter((r) => r.customerName === "A"), { year: 2026 }, globalRows);
      expect(result.period).toEqual({
        currentYear: 2026, priorYear: 2025, startMonth: 1, endMonth: 3,
        months: [1, 2, 3], kind: "ytd", availableCurrentMonths: [1, 3],
        availablePriorMonths: [1], missingCurrentMonths: [2], missingPriorMonths: [2, 3],
      });
    },
  );

  it.each([summarizeSalesRowsForTest, summarizeProductYoYRowsForTest])(
    "has no default months when only prior-year data exists, but honors explicit future months",
    (summarize) => {
      const data = [row(2025, 12)];
      expect(summarize(data, { year: 2026 }).period).toMatchObject({ months: [], endMonth: 0, availableCurrentMonths: [], availablePriorMonths: [] });
      expect(summarize(data, { year: 2026, startMonth: 9, endMonth: 10 }).period).toMatchObject({
        months: [9, 10], kind: "period", missingCurrentMonths: [9, 10], missingPriorMonths: [9, 10],
      });
      expect(summarize(data, { year: 2026, startMonth: 12, endMonth: 12 }).period.kind).toBe("month");
    },
  );

  it.each([2, 1])("retains the previous calendar baseline for selected month %s", (month) => {
    const data = [row(2025, 12, 50), row(2026, 1, 100), row(2026, 2, 150)];
    const result = summarizeSalesRowsForTest(data, { year: 2026, startMonth: month, endMonth: month });
    expect(result.monthly).toHaveLength(1);
    expect(result.monthly[0]).toMatchObject({ momQuantityGrowth: month === 1 ? 1 : 0.5, momRevenueGrowth: month === 1 ? 1 : 0.5 });
    expect(result.customerMovement.byPeriod.ytd.label).toBe("Month");
  });

  it("distinguishes a filtered zero from globally unavailable chart data", () => {
    const data = [row(2025, 1), row(2025, 2, 20, "B"), row(2026, 1), row(2026, 3, 30, "B")];
    const result = summarizeSalesRowsForTest(data, { year: 2026, customerName: "A", endMonth: 4 });
    expect(result.monthly.map((r) => [r.quantity, r.revenue])).toEqual([[10, 100], [null, null], [0, 0], [null, null]]);
    expect(result.yoyComparison.map((r) => [r.currentQuantity, r.priorQuantity, r.currentRevenue, r.priorRevenue])).toEqual([
      [10, 10, 100, 100], [null, 0, null, 0], [0, null, 0, null], [null, null, null, null],
    ]);
    expect(result.yoyComparison.slice(1).every((r) => r.quantityGrowth === null && r.revenueGrowth === null)).toBe(true);
  });

  it("uses global movement options within the window, preferring the latest current month", () => {
    const globalRows = [row(2025, 1), row(2025, 4), row(2025, 12), row(2026, 1), row(2026, 3, 20, "B")];
    const result = summarizeSalesRowsForTest(globalRows, { year: 2026, customerName: "A", startMonth: 2, endMonth: 5 });
    expect(result.period).toMatchObject({ availableCurrentMonths: [3], availablePriorMonths: [4] });
    expect(result.customerMovement).toMatchObject({ currentYear: 2026, priorYear: 2025, defaultPeriod: "03" });
    expect(result.customerMovement.periods).toEqual([{ value: "ytd", label: "Period" }, { value: "03", label: "Mar" }, { value: "04", label: "Apr" }]);
    expect(result.customerMovement.byPeriod.ytd).toMatchObject({ currentAvailable: false, priorAvailable: false, declining: [], growing: [], summary: { quantityGrowth: null, revenueGrowth: null } });
    expect(result.customerMovement.byPeriod["03"]).toMatchObject({ currentAvailable: true, priorAvailable: false, declining: [], growing: [] });
    expect(result.customerMovement.byPeriod["04"]).toMatchObject({ currentAvailable: false, priorAvailable: true, declining: [], growing: [] });
  });

  it("treats no filtered purchase in an available month as a real customer decline", () => {
    const data = [row(2025, 3, 10), row(2026, 3, 20, "B")];
    const result = summarizeSalesRowsForTest(data, { year: 2026, customerName: "A", startMonth: 3, endMonth: 3 });
    expect(result.monthly[0]).toMatchObject({ quantity: 0, yoyQuantityGrowth: -1 });
    expect(result.customerMovement.byPeriod.ytd).toMatchObject({ currentAvailable: true, priorAvailable: true, declining: [expect.objectContaining({ customerName: "A", quantityGrowth: -1 })] });
  });

  it("preserves numeric product totals but suppresses growth for incomplete windows", () => {
    const data = [row(2025, 1, 20), row(2025, 2, 20), row(2026, 1, 10), row(2026, 3, 30)];
    const result = summarizeProductYoYRowsForTest(data, { year: 2026 });
    expect(result.summary).toMatchObject({ currentQuantity: 40, priorQuantity: 40, currentRevenue: 400, priorRevenue: 400, quantityGrowth: null, revenueGrowth: null });
    expect(result.rows[0].quantityGrowth).toBeNull();
  });

  it.each([getSalesAnalytics, getProductYoYAnalytics])("loads both full calendar years and global availability", async (getAnalytics) => {
    findMany.mockResolvedValue([]);
    await getAnalytics({ year: 2026, startMonth: 1, endMonth: 1, salesperson: "Allen", category: "Tire", customerName: "A", sku: "SKU", memberName: "Member", shipToState: "TX" });
    const orderDate = { gte: new Date(2025, 0, 1), lt: new Date(2027, 0, 1) };
    expect(findMany.mock.calls[0][0].where.orderDate).toEqual(orderDate);
    expect(findMany.mock.calls[1][0].where).toEqual({ orderDate });
  });

  it("preserves full Jan-Aug totals and 606 SKU rows", () => {
    const data = Array.from({ length: 606 }, (_, index) => [row(2025, index % 8 + 1, 10, "A", `SKU-${index}`), row(2026, index % 8 + 1, 15, "A", `SKU-${index}`)]).flat();
    const product = summarizeProductYoYRowsForTest(data, { year: 2026 });
    const sales = summarizeSalesRowsForTest(data, { year: 2026 });
    expect(product.summary).toMatchObject({ currentQuantity: 9090, priorQuantity: 6060, currentRevenue: 90900, priorRevenue: 60600, lineItemCount: 606, quantityGrowth: 0.5, revenueGrowth: 0.5 });
    expect(product.rows).toHaveLength(606);
    expect(sales.kpis).toMatchObject({ ytdQuantity: 9090, ytdRevenue: 90900 });
    expect(sales.period).toEqual(product.period);
    expect(product.period.missingCurrentMonths).toEqual([]);
    expect(product.period.missingPriorMonths).toEqual([]);
  });
});
