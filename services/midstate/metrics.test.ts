import { describe, expect, test } from "vitest";
import { summarizeMidstateRowsForTest } from "@/services/midstate/metrics";

const rows = [
  { postDate: new Date(2025, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "WD1030", description: "Wheel", orderClass: "Warehouse", category: null, quantity: 100, costExt: 1000 },
  { postDate: new Date(2026, 0, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "WD1030", description: "Wheel", orderClass: "Warehouse", category: null, quantity: 50, costExt: 500 },
  { postDate: new Date(2026, 3, 1), memberNumber: "758801", memberName: "Running Supply", sku: "ASB1088", description: "Tire", orderClass: "Warehouse", category: "Lawn & Garden", quantity: 25, costExt: 625 },
  { postDate: new Date(2026, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "WD1030", description: "Wheel", orderClass: "Warehouse", category: null, quantity: 200, costExt: 2000 },
  { postDate: new Date(2026, 4, 2), memberNumber: "759004", memberName: "Olney", sku: "ASR1200", description: "Radial", orderClass: "Direct", category: "ST Radial", quantity: 10, costExt: 900 },
];

describe("midstate metrics", () => {
  test("summarizes YTD, current month, rankings, and order class split", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
      startMonth: 1,
      endMonth: 5,
    });

    expect(analytics.kpis.ytdQuantity).toBe(285);
    expect(analytics.kpis.currentMonthQuantity).toBe(210);
    expect(analytics.kpis.ytdCostExt).toBe(4025);
    expect(analytics.kpis.activeMembers).toBe(3);
    expect(analytics.topMembers[0]).toMatchObject({ name: "Bomgaars", quantity: 250 });
    expect(analytics.topSkus[0]).toMatchObject({ name: "WD1030", quantity: 250 });
    expect(analytics.orderClassMonthly.at(-1)).toMatchObject({
      month: "2026-05",
      Warehouse: 200,
      Direct: 10,
    });
  });

  test("computes YoY and MoM for the latest month", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
      startMonth: 1,
      endMonth: 5,
    });

    const may = analytics.monthly.find((month) => month.month === "2026-05");
    expect(may?.momQuantityGrowth).toBe(7.4);
    expect(may?.yoyQuantityGrowth).toBe(1.1);
  });

  test("applies member, sku, category, and order class filters", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
      startMonth: 1,
      endMonth: 5,
      memberNumber: "759004",
      sku: "ASR1200",
      category: "ST Radial",
      orderClass: "Direct",
    });

    expect(analytics.kpis.ytdQuantity).toBe(10);
    expect(analytics.topMembers).toHaveLength(1);
    expect(analytics.topMembers[0].name).toBe("Olney");
  });
});
