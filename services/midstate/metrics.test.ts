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

  test("uses the latest available month as current month when endMonth is omitted", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
    });

    expect(analytics.kpis.currentMonthQuantity).toBe(210);
  });

  test("returns no SKU member distribution when no SKU filter is selected", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
      startMonth: 1,
      endMonth: 5,
    });

    expect(analytics.skuByMember).toEqual([]);
  });

  test("returns member distribution for the selected SKU", () => {
    const analytics = summarizeMidstateRowsForTest(
      [
        ...rows,
        {
          postDate: new Date(2026, 4, 3),
          memberNumber: "758801",
          memberName: "Running Supply",
          sku: "WD1030",
          description: "Wheel",
          orderClass: "Warehouse",
          category: null,
          quantity: 75,
          costExt: 750,
        },
      ],
      {
        year: 2026,
        startMonth: 1,
        endMonth: 5,
        sku: "WD1030",
      },
    );

    expect(analytics.skuByMember).toEqual([
      {
        name: "Bomgaars",
        memberNumber: "82801",
        quantity: 250,
        costExt: 2500,
      },
      {
        name: "Running Supply",
        memberNumber: "758801",
        quantity: 75,
        costExt: 750,
      },
    ]);
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

  test("keeps YTD through selected end month when the displayed range starts later", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
      startMonth: 5,
      endMonth: 5,
    });

    expect(analytics.monthly.map((month) => month.month)).toEqual(["2026-05"]);
    expect(analytics.kpis.ytdQuantity).toBe(285);
    expect(analytics.kpis.ytdCostExt).toBe(4025);
    expect(analytics.kpis.currentMonthQuantity).toBe(210);
  });

  test("computes MoM against the prior month outside the displayed range", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
      startMonth: 5,
      endMonth: 5,
    });

    expect(analytics.monthly[0]).toMatchObject({
      month: "2026-05",
      quantity: 210,
      momQuantityGrowth: 7.4,
    });
    expect(analytics.kpis.latestMoMQuantityGrowth).toBe(7.4);
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

  test("builds selected member and overall rolling 12-month quantity series", () => {
    const rollingRows = [
      { postDate: new Date(2025, 5, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "WD1030", description: "Wheel", orderClass: "Warehouse", category: null, quantity: 5, costExt: 50 },
      { postDate: new Date(2026, 3, 1), memberNumber: "758801", memberName: "Running Supply", sku: "ASB1088", description: "Tire", orderClass: "Warehouse", category: "Lawn & Garden", quantity: 25, costExt: 625 },
      { postDate: new Date(2026, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "WD1030", description: "Wheel", orderClass: "Warehouse", category: null, quantity: 200, costExt: 2000 },
      { postDate: new Date(2026, 4, 2), memberNumber: "759004", memberName: "Olney", sku: "ASR1200", description: "Radial", orderClass: "Direct", category: "ST Radial", quantity: 10, costExt: 900 },
    ];

    const analytics = summarizeMidstateRowsForTest(
      rollingRows,
      {
        year: 2026,
        memberNumber: "82801",
      },
      rollingRows,
    );

    expect(analytics.rollingMonths).toHaveLength(12);
    expect(analytics.rollingMonths[0]).toEqual({
      month: "2025-06",
      quantity: 5,
    });
    expect(analytics.rollingMonths[1]).toEqual({
      month: "2025-07",
      quantity: 0,
    });
    expect(analytics.rollingMonths.at(-1)).toEqual({
      month: "2026-05",
      quantity: 200,
    });
    expect(analytics.overallRollingMonths.at(-1)).toEqual({
      month: "2026-05",
      quantity: 210,
      activeMembers: 2,
      topMember: "Bomgaars",
      topSku: "WD1030",
    });
    expect(analytics.selectedMember).toEqual({
      memberNumber: "82801",
      memberName: "Bomgaars",
    });
  });

  test("ranks items by category across the latest rolling 12 months", () => {
    const rankingRows = [
      { postDate: new Date(2025, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "OLD100", description: "Old item", orderClass: "Warehouse", category: "Lawn & Garden", quantity: 999, costExt: 9990 },
      { postDate: new Date(2025, 5, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "LG200", description: "Garden tire", orderClass: "Warehouse", category: "Lawn & Garden", quantity: 40, costExt: 400 },
      { postDate: new Date(2026, 3, 1), memberNumber: "758801", memberName: "Running Supply", sku: "BIAS300", description: "Bias tire", orderClass: "Warehouse", category: "ST Bias", quantity: 25, costExt: 625 },
      { postDate: new Date(2026, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "LG200", description: "Garden tire", orderClass: "Warehouse", category: "Lawn & Garden", quantity: 35, costExt: 350 },
      { postDate: new Date(2026, 4, 2), memberNumber: "759004", memberName: "Olney", sku: "RAD400", description: "Radial tire", orderClass: "Direct", category: "ST Radial", quantity: 90, costExt: 900 },
    ];

    const analytics = summarizeMidstateRowsForTest(rankingRows, {
      year: 2026,
      memberNumber: "82801",
    });

    expect(analytics.itemRankings).toEqual([
      {
        rank: 1,
        itemNumber: "RAD400",
        description: "Radial tire",
        category: "ST Radial",
        quantity: 90,
      },
      {
        rank: 2,
        itemNumber: "LG200",
        description: "Garden tire",
        category: "Lawn & Garden",
        quantity: 75,
      },
      {
        rank: 3,
        itemNumber: "BIAS300",
        description: "Bias tire",
        category: "ST Bias",
        quantity: 25,
      },
    ]);
  });

  test("infers common Midstate item categories when source category is blank", () => {
    const analytics = summarizeMidstateRowsForTest(
      [
        { postDate: new Date(2026, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "ASR1200", description: "ST175/80R13 5-LUG", orderClass: "Warehouse", category: null, quantity: 10, costExt: 100 },
        { postDate: new Date(2026, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "ASB1001", description: "ST175/80D13 5-LUG", orderClass: "Warehouse", category: null, quantity: 9, costExt: 90 },
        { postDate: new Date(2026, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "WD1030", description: "15X6-6 SU05 LG", orderClass: "Warehouse", category: null, quantity: 8, costExt: 80 },
      ],
      { year: 2026 },
    );

    expect(analytics.itemRankings.map((row) => row.category)).toEqual([
      "ST Radial",
      "ST Bias",
      "Lawn & Garden",
    ]);
  });
});
