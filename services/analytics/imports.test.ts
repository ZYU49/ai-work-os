import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitSalesImport,
  createSalesImportFromFile,
} from "@/services/analytics/imports";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => Buffer.from("")),
}));

vi.mock("@/lib/storage", () => ({
  saveUploadedFile: vi.fn(),
  deleteStoredFile: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    salesImport: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    salesRecord: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback) =>
      callback({
        salesImport: {
          update: vi.fn(async (input) => ({ id: input.where.id, ...input.data })),
        },
        salesRecord: {
          deleteMany: vi.fn(),
          createMany: vi.fn(async (input) => ({ count: input.data.length })),
        },
      }),
    ),
  },
}));

vi.mock("@/services/analytics/parser", () => ({
  extractWorkbookPreview: vi.fn(() => ({
    sheetName: "Sales Report by Period",
    headers: ["Invoice Date", "Customer Name", "Item", "Quantity", "Total Sales"],
    previewRows: [],
    totalRows: 2,
  })),
  rowsFromWorkbook: vi.fn(() => [
    {
      "Invoice Date": "2026-01-02",
      "Customer Name": "Customer A",
      Item: "SKU-1",
      Quantity: "2",
      "Total Sales": "20",
    },
    {
      "Invoice Date": "bad",
      "Customer Name": "",
      Item: "SKU-2",
      Quantity: "x",
      "Total Sales": "30",
    },
  ]),
  normalizeSalesRow: vi.fn((row) =>
    row["Invoice Date"] === "bad"
      ? { ok: false, errors: ["Date is invalid."] }
      : {
          ok: true,
          record: {
            orderDate: new Date("2026-01-02T00:00:00"),
            customerName: "Customer A",
            sku: "SKU-1",
            quantity: 2,
            revenue: 20,
            unitPrice: 10,
          },
        },
  ),
}));

describe("commitSalesImport", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import("@/lib/db");
    const { saveUploadedFile } = await import("@/lib/storage");
    vi.mocked(saveUploadedFile).mockResolvedValue({
      fileName: "sales-upload.xlsx",
      originalName: "sales.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 12,
      storagePath: "storage/uploads/sales.xlsx",
    });
    vi.mocked(prisma.salesImport.create).mockResolvedValue({
      id: "import-1",
      fileName: "sales.xlsx",
    } as never);
    vi.mocked(prisma.salesImport.findUnique).mockResolvedValue({
      id: "import-1",
      storagePath: "storage/uploads/sales.xlsx",
      sheetName: "Sales Report by Period",
    } as never);
  });

  it("imports valid rows and counts rejected rows", async () => {
    const result = await commitSalesImport("import-1", {
      orderDate: "Invoice Date",
      customerName: "Customer Name",
      sku: "Item",
      quantity: "Quantity",
      revenue: "Total Sales",
    });

    expect(result).toMatchObject({
      importId: "import-1",
      totalRows: 2,
      importedRows: 1,
      rejectedRows: 1,
    });
  });

  it("deletes a saved upload if prisma create fails", async () => {
    const { prisma } = await import("@/lib/db");
    const { deleteStoredFile } = await import("@/lib/storage");
    vi.mocked(prisma.salesImport.create).mockRejectedValueOnce(
      new Error("db unavailable"),
    );

    await expect(
      createSalesImportFromFile(
        new File(["id,value"], "sales.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ),
    ).rejects.toThrow("db unavailable");

    expect(deleteStoredFile).toHaveBeenCalledWith("storage/uploads/sales.xlsx");
  });
});
