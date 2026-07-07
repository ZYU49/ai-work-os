import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  commitSalesImport,
  createSalesImportFromFile,
} from "@/services/analytics/imports";

const txSalesImportUpdate = vi.fn(async (input) => ({
  id: input.where.id,
  ...input.data,
}));
const txSalesRecordDeleteMany = vi.fn();
const txSalesRecordCreateMany = vi.fn(async (input) => ({
  count: input.data.length,
}));

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
          update: txSalesImportUpdate,
        },
        salesRecord: {
          deleteMany: txSalesRecordDeleteMany,
          createMany: txSalesRecordCreateMany,
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
    txSalesImportUpdate.mockResolvedValue({
      id: "import-1",
      status: "imported",
    });
    txSalesRecordCreateMany.mockImplementation(async (input) => ({
      count: input.data.length,
    }));
  });

  it("imports valid rows and counts rejected rows", async () => {
    const { prisma } = await import("@/lib/db");

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
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { maxWait: 10_000, timeout: 120_000 },
    );
    expect(prisma.salesRecord.deleteMany).not.toHaveBeenCalled();
    expect(prisma.salesRecord.createMany).not.toHaveBeenCalled();
    expect(prisma.salesImport.update).not.toHaveBeenCalled();
    expect(txSalesRecordDeleteMany).toHaveBeenCalledWith({
      where: { importId: "import-1" },
    });
    expect(txSalesRecordCreateMany).toHaveBeenCalledTimes(1);
    expect(txSalesImportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "import-1" },
        data: expect.objectContaining({
          importedRows: 1,
          rejectedRows: 1,
          totalRows: 2,
        }),
      }),
    );
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

  it("writes large imports in smaller createMany batches", async () => {
    const { rowsFromWorkbook, normalizeSalesRow } = await import(
      "@/services/analytics/parser"
    );

    vi.mocked(rowsFromWorkbook).mockReturnValue(
      Array.from({ length: 2501 }, (_, index) => ({
        "Invoice Date": `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
        "Customer Name": `Customer ${index}`,
        Item: `SKU-${index}`,
        Quantity: "1",
        "Total Sales": "10",
      })),
    );
    vi.mocked(normalizeSalesRow).mockImplementation((row) => ({
      ok: true,
      record: {
        orderDate: new Date(`${row["Invoice Date"]}T00:00:00`),
        customerName: String(row["Customer Name"]),
        sku: String(row.Item),
        quantity: 1,
        revenue: 10,
        unitPrice: 10,
      },
    }));

    await commitSalesImport("import-1", {
      orderDate: "Invoice Date",
      customerName: "Customer Name",
      sku: "Item",
      quantity: "Quantity",
      revenue: "Total Sales",
    });

    expect(txSalesRecordCreateMany).toHaveBeenCalledTimes(3);
    expect(txSalesRecordCreateMany.mock.calls.map(([input]) => input.data.length)).toEqual([
      1000,
      1000,
      501,
    ]);
  });

  it("rolls back chunked writes when a later batch fails", async () => {
    const { prisma } = await import("@/lib/db");
    const { rowsFromWorkbook, normalizeSalesRow } = await import(
      "@/services/analytics/parser"
    );

    vi.mocked(rowsFromWorkbook).mockReturnValue(
      Array.from({ length: 2501 }, (_, index) => ({
        "Invoice Date": `2026-02-${String((index % 28) + 1).padStart(2, "0")}`,
        "Customer Name": `Customer ${index}`,
        Item: `SKU-${index}`,
        Quantity: "1",
        "Total Sales": "10",
      })),
    );
    vi.mocked(normalizeSalesRow).mockImplementation((row) => ({
      ok: true,
      record: {
        orderDate: new Date(`${row["Invoice Date"]}T00:00:00`),
        customerName: String(row["Customer Name"]),
        sku: String(row.Item),
        quantity: 1,
        revenue: 10,
        unitPrice: 10,
      },
    }));
    txSalesRecordCreateMany
      .mockResolvedValueOnce({ count: 1000 })
      .mockRejectedValueOnce(new Error("insert failed"));

    await expect(
      commitSalesImport("import-1", {
        orderDate: "Invoice Date",
        customerName: "Customer Name",
        sku: "Item",
        quantity: "Quantity",
        revenue: "Total Sales",
      }),
    ).rejects.toThrow("insert failed");

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { maxWait: 10_000, timeout: 120_000 },
    );
    expect(txSalesRecordDeleteMany).toHaveBeenCalledTimes(1);
    expect(txSalesRecordCreateMany).toHaveBeenCalledTimes(2);
    expect(txSalesImportUpdate).not.toHaveBeenCalled();
    expect(prisma.salesRecord.deleteMany).not.toHaveBeenCalled();
    expect(prisma.salesRecord.createMany).not.toHaveBeenCalled();
    expect(prisma.salesImport.update).not.toHaveBeenCalled();
  });
});
