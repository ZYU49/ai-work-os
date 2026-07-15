import { describe, expect, test } from "vitest";
import {
  getMidstateFobCost,
  listMidstateFobCosts,
} from "@/services/midstate/fob-cost";

describe("Midstate FOB cost", () => {
  test("returns effective FOB cost by item number", () => {
    expect(getMidstateFobCost("wd1030")).toMatchObject({
      itemNumber: "WD1030",
      sourceSheet: "L&G",
      midstatesSku: "10047968",
      size: "15X6.00-6 2",
      currentFob: 6.66,
      increase: -0.04,
      effectiveFob: 6.39,
      effectiveDate: "2025-05-15",
      containerQty40: 4400,
      containerQty20: null,
    });
  });

  test("combines wheelbarrow 40HQ and 20ft container quantities", () => {
    expect(getMidstateFobCost("WB1001")).toMatchObject({
      itemNumber: "WB1001",
      currentFob: 3.14,
      effectiveFob: 3.01,
      containerQty40: 17799,
      containerQty20: 7200,
    });
  });

  test("lists unique FOB cost records", () => {
    const costs = listMidstateFobCosts();

    expect(costs).toHaveLength(165);
    expect(new Set(costs.map((cost) => cost.itemNumber)).size).toBe(165);
  });
});
