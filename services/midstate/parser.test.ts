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

  test("extracts a May rolling file preview from every RAW DATA month", () => {
    const buffer = workbookBuffer([
      headers,
      [
        "Sutong",
        10047918,
        "Prior year SKU",
        "OLD2025",
        "Prior Member",
        "2025",
        "1001718",
        "Warehouse",
        100,
        new Date(2025, 5, 2),
        1,
        100,
      ],
      [
        "Sutong",
        10047919,
        "Prior month SKU",
        "APR2026",
        "April Member",
        "42026",
        "1001718",
        "Warehouse",
        50,
        new Date(2026, 3, 30),
        1,
        50,
      ],
      [
        "Sutong",
        10047920,
        "May warehouse SKU",
        "MAY-WH",
        "May Member A",
        "52026A",
        "1001718",
        "Warehouse",
        3,
        new Date(2026, 4, 1),
        1,
        3,
      ],
      [
        "Sutong",
        10047921,
        "May direct SKU",
        "MAY-DIR",
        "May Member B",
        "52026B",
        "1001718",
        "Direct",
        2,
        new Date(2026, 4, 30),
        1,
        2,
      ],
    ]);

    const preview = extractMidstatePreview({
      buffer,
      fileName: "1001718 May 2026.xlsx",
    });

    expect(preview.totalRows).toBe(4);
    expect(preview.totalQuantity).toBe(155);
    expect(preview.warehouseQuantity).toBe(153);
    expect(preview.directQuantity).toBe(2);
    expect(preview.memberCount).toBe(4);
    expect(preview.skuCount).toBe(4);
    expect(preview.dateRange).toEqual({
      start: "2025-06-02",
      end: "2026-05-30",
    });
    expect(preview.periodYear).toBe(2026);
    expect(preview.periodMonth).toBe(5);
    expect(preview.previewRows.map((row) => row.VIN)).toEqual([
      "OLD2025",
      "APR2026",
      "MAY-WH",
      "MAY-DIR",
    ]);
  });

  test("falls back to the latest valid Post Date month when filename has no period", () => {
    const buffer = workbookBuffer([
      headers,
      ...Array.from({ length: 3 }, (_, index) => [
        "Sutong",
        10047918 + index,
        "April SKU",
        `APR-${index}`,
        `April Member ${index}`,
        `4${index}`,
        "1001718",
        "Warehouse",
        10,
        new Date(2026, 3, index + 1),
        1,
        10,
      ]),
      [
        "Sutong",
        10047921,
        "May SKU",
        "MAY-LATEST",
        "May Member",
        "5",
        "1001718",
        "Direct",
        2,
        new Date(2026, 4, 1),
        1,
        2,
      ],
    ]);

    const preview = extractMidstatePreview({
      buffer,
      fileName: "midstate rolling export.xlsx",
    });

    expect(preview.periodYear).toBe(2026);
    expect(preview.periodMonth).toBe(5);
    expect(preview.totalRows).toBe(4);
    expect(preview.totalQuantity).toBe(32);
    expect(preview.previewRows.map((row) => row.VIN)).toEqual([
      "APR-0",
      "APR-1",
      "APR-2",
      "MAY-LATEST",
    ]);
  });

  test("validates RAW DATA headers when the sheet has no data rows", () => {
    const buffer = workbookBuffer([headers]);

    const preview = extractMidstatePreview({
      buffer,
      fileName: "1001718 Empty 2026.xlsx",
    });

    expect(preview.headers).toEqual(headers);
    expect(preview.totalRows).toBe(0);
    expect(preview.totalQuantity).toBe(0);
    expect(preview.memberCount).toBe(0);
    expect(preview.skuCount).toBe(0);
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

  test("keeps blank optional Cost and Cost Ext values as null", () => {
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
      Cost: "",
      "Cost Ext": "   ",
    });

    expect(result).toMatchObject({
      ok: true,
      record: {
        cost: null,
        costExt: null,
      },
    });
  });

  test("rejects invalid nonblank optional Cost and Cost Ext values", () => {
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
      Cost: "not-a-cost",
      "Cost Ext": "not-a-cost-ext",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Cost is invalid.");
      expect(result.errors).toContain("Cost Ext is invalid.");
    }
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
