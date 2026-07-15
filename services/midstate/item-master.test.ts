import { describe, expect, test } from "vitest";
import {
  getMidstateItemMetadata,
  listMidstateItemMaster,
} from "@/services/midstate/item-master";

describe("Midstate item master", () => {
  test("returns generated product details for an item number", () => {
    expect(getMidstateItemMetadata("wd1030")).toMatchObject({
      description: "15X6.00-6 2PR SU05 HI-RUN",
      itemGroup: "L&G Tires",
      category: "L&G Tires",
      size: "15X6.00-6",
      brand: "HI-RUN",
      length: 13,
      width: 13,
      height: 5,
      weight: 5.4,
      fobCost: expect.objectContaining({
        effectiveFob: 6.39,
        effectiveDate: "2025-05-15",
      }),
    });
  });

  test("keeps one record per duplicate item and prefers the EA row", () => {
    expect(getMidstateItemMetadata("ASB1001")).toMatchObject({
      description:
        "ST175/80D13 6PR HI RUN MOUNTED ON 13X4.5 5-4.5 WHITE WHEEL (8 SPOKE)",
      itemGroup: "STD ASSEMBLY",
      uom: "EA",
    });
  });

  test("lists unique product master records for browsing", () => {
    const items = listMidstateItemMaster();

    expect(items).toHaveLength(792);
    expect(new Set(items.map((item) => item.itemNumber)).size).toBe(792);
    expect(items[0]).toEqual(
      expect.objectContaining({
        itemNumber: expect.any(String),
        description: expect.any(String),
        itemGroup: expect.any(String),
      }),
    );
  });
});
