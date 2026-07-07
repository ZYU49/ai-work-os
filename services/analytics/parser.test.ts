import { utils, write } from "xlsx";
import { describe, expect, it } from "vitest";
import {
  extractWorkbookPreview,
  normalizeSalesRow,
  rowsFromWorkbook,
} from "@/services/analytics/parser";

function workbookBuffer(rows: Record<string, unknown>[]) {
  const sheet = utils.json_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, "Sales Report by Period");
  return Buffer.from(write(workbook, { type: "buffer", bookType: "xlsx" }));
}

function workbookBufferFromSheet(sheet: unknown[][], sheetName = "Sales Report by Period") {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(sheet), sheetName);
  return Buffer.from(write(workbook, { type: "buffer", bookType: "xlsx" }));
}

const mapping = {
  orderDate: "Invoice Date",
  customerName: "Customer Name",
  sku: "Item",
  productName: "Description",
  category: "Item Group",
  salesperson: "Sales Person",
  quantity: "Quantity",
  revenue: "Total Sales",
} as const;

describe("sales parser", () => {
  it("extracts headers and preview rows from an Excel workbook", () => {
    const preview = extractWorkbookPreview({
      fileName: "sales.xlsx",
      buffer: workbookBuffer([
        {
          "Invoice Date": "2026-01-02",
          "Customer Name": "WAL-MART.COM",
          Item: "ASB1084",
          Quantity: 1,
          "Total Sales": 28,
        },
      ]),
    });

    expect(preview.sheetName).toBe("Sales Report by Period");
    expect(preview.headers).toEqual([
      "Invoice Date",
      "Customer Name",
      "Item",
      "Quantity",
      "Total Sales",
    ]);
    expect(preview.previewRows).toHaveLength(1);
  });

  it("uses the first non-empty row as headers when a workbook starts with blank rows", () => {
    const buffer = workbookBufferFromSheet([
      [null, null, null, null, null],
      ["Invoice Date", "Customer Name", "Item", "Quantity", "Total Sales"],
      ["2026-01-02", "WAL-MART.COM", "ASB1084", 1, 28],
    ]);

    const preview = extractWorkbookPreview({
      fileName: "sales.xlsx",
      buffer,
    });

    expect(preview.headers).toEqual([
      "Invoice Date",
      "Customer Name",
      "Item",
      "Quantity",
      "Total Sales",
    ]);
    expect(preview.previewRows).toEqual([
      {
        "Invoice Date": "2026-01-02",
        "Customer Name": "WAL-MART.COM",
        Item: "ASB1084",
        Quantity: 1,
        "Total Sales": 28,
      },
    ]);
    expect(rowsFromWorkbook(buffer)).toEqual(preview.previewRows);
  });

  it("captures header names even when the workbook has no data rows", () => {
    const preview = extractWorkbookPreview({
      fileName: "sales.xlsx",
      buffer: workbookBufferFromSheet([
        ["Invoice Date", "Customer Name", "Item", "Quantity", "Total Sales"],
      ]),
    });

    expect(preview.headers).toEqual([
      "Invoice Date",
      "Customer Name",
      "Item",
      "Quantity",
      "Total Sales",
    ]);
    expect(preview.previewRows).toEqual([]);
    expect(preview.totalRows).toBe(0);
  });

  it("normalizes a valid mapped row", () => {
    const row = normalizeSalesRow(
      {
        "Invoice Date": "2026-01-02",
        "Customer Name": "WAL-MART.COM",
        Item: "ASB1084",
        Description: "Assembly",
        "Item Group": "L&G Assembly",
        "Sales Person": "Bella Cui",
        Quantity: "2",
        "Total Sales": "56.00",
      },
      mapping,
    );

    expect(row.ok).toBe(true);
    if (row.ok) {
      expect(row.record.customerName).toBe("WAL-MART.COM");
      expect(row.record.sku).toBe("ASB1084");
      expect(row.record.quantity).toBe(2);
      expect(row.record.revenue).toBe(56);
      expect(row.record.unitPrice).toBe(28);
    }
  });

  it("rejects rows with invalid required values", () => {
    const row = normalizeSalesRow(
      {
        "Invoice Date": "not a date",
        "Customer Name": "",
        Item: "ASB1084",
        Quantity: "abc",
        "Total Sales": "56",
      },
      mapping,
    );

    expect(row).toEqual({
      ok: false,
      errors: [
        "Date is invalid.",
        "Customer is required.",
        "Quantity is invalid.",
      ],
    });
  });
});
