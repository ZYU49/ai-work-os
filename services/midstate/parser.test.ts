import { describe, expect, test } from "vitest";
import { utils, write } from "xlsx";
import {
  extractMidstatePreview,
  normalizeMidstateRow,
  rowsFromMidstateWorkbook,
} from "@/services/midstate/parser";

const headers = [
  "Vendor Name",
  "MS Item Number",
  "Description",
  "VIN",
  "Member Name",
  "Member Number",
  "Vendor Number",
  "Order Class",
  "Qty Shipped",
  "Post Date",
  "Cost",
  "Cost Ext",
];

function workbookBuffer(rows: unknown[][], sheetName = "RAW DATA") {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), sheetName);
  return Buffer.from(write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("midstate parser", () => {
  test("extracts preview from RAW DATA and totals the source file", () => {
    const buffer = workbookBuffer([
      headers,
      [
        "Sutong",
        10047918,
        "4.80/4.00-8-4 WB",
        "CT1008",
        "Bomgaars",
        "82801",
        "1001718",
        "Warehouse",
        2,
        new Date(2026, 4, 1),
        9.88,
        19.76,
      ],
      [
        "Sutong",
        10047919,
        "LG 15X6-6 WHT",
        "ASB1088",
        "Olney",
        "759004",
        "1001718",
        "Direct",
        1,
        new Date(2026, 4, 2),
        25.22,
        25.22,
      ],
    ]);

    const preview = extractMidstatePreview({
      buffer,
      fileName: "1001718 May 2026.xlsx",
    });

    expect(preview.sheetName).toBe("RAW DATA");
    expect(preview.totalRows).toBe(2);
    expect(preview.totalQuantity).toBe(3);
    expect(preview.warehouseQuantity).toBe(2);
    expect(preview.directQuantity).toBe(1);
    expect(preview.memberCount).toBe(2);
    expect(preview.skuCount).toBe(2);
    expect(preview.periodYear).toBe(2026);
    expect(preview.periodMonth).toBe(5);
    expect(preview.vendorNumber).toBe("1001718");
  });

  test("requires the RAW DATA worksheet", () => {
    const buffer = workbookBuffer([headers], "Sheet1");

    expect(() =>
      extractMidstatePreview({ buffer, fileName: "bad.xlsx" }),
    ).toThrow("Midstate workbook must include a RAW DATA sheet.");
  });

  test("normalizes a valid row", () => {
    const result = normalizeMidstateRow({
      "Vendor Name": "Sutong Tire Resources",
      "MS Item Number": 10047919,
      Description: "LG 15X6-6 WHT",
      VIN: "ASB1088",
      "Member Name": "Running Supply, Inc.",
      "Member Number": "758801",
      "Vendor Number": "1001718",
      "Order Class": "Warehouse",
      "Qty Shipped": 2,
      "Post Date": new Date(2026, 4, 2),
      Cost: 25.22,
      "Cost Ext": 50.44,
    });

    expect(result).toMatchObject({
      ok: true,
      record: {
        sku: "ASB1088",
        memberNumber: "758801",
        memberName: "Running Supply, Inc.",
        orderClass: "Warehouse",
        quantity: 2,
        cost: 25.22,
        costExt: 50.44,
      },
    });
  });

  test("rejects invalid required values", () => {
    const result = normalizeMidstateRow({
      "Member Name": "",
      "Member Number": "",
      VIN: "",
      "Order Class": "",
      "Qty Shipped": "not-a-number",
      "Post Date": "not-a-date",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Post Date is invalid.");
      expect(result.errors).toContain("SKU is required.");
      expect(result.errors).toContain("Qty Shipped is invalid.");
    }
  });

  test("returns rows from RAW DATA", () => {
    const buffer = workbookBuffer([
      headers,
      [
        "Sutong",
        1,
        "desc",
        "SKU1",
        "Member",
        "1",
        "1001718",
        "Warehouse",
        1,
        new Date(2026, 4, 1),
        1,
        1,
      ],
    ]);

    expect(rowsFromMidstateWorkbook(buffer)).toHaveLength(1);
  });
});
