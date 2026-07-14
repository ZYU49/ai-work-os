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
    });
  });

  test("lists unique product master records for browsing", () => {
    const items = listMidstateItemMaster();

    expect(items.length).toBeGreaterThanOrEqual(800);
    expect(items[0]).toEqual(
      expect.objectContaining({
        itemNumber: expect.any(String),
        description: expect.any(String),
        itemGroup: expect.any(String),
      }),
    );
  });
});
