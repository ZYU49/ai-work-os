import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  commitMidstateImport,
  createMidstateImportFromFile,
} from "@/services/midstate/imports";
import { prisma } from "@/lib/db";
import { deleteStoredFile, saveUploadedFile } from "@/lib/storage";
import {
  extractMidstatePreview,
  rowsFromMidstateWorkbook,
} from "@/services/midstate/parser";

function midstateImport(overrides = {}) {
  return {
    id: "import-1",
    fileName: "1001718 May 2026.xlsx",
    storagePath: "storage/uploads/midstate.xlsx",
    sheetName: "RAW DATA",
    status: "uploaded",
    totalRows: 2,
    importedRows: 0,
    rejectedRows: 0,
    errorMessage: null,
    periodYear: 2026,
    periodMonth: 5,
    vendorNumber: "1001718",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function validMidstateRow(overrides = {}) {
  return {
    "Vendor Name": "Sutong Tire Resources",
    "MS Item Number": 10047918,
    Description: "4.80/4.00-8-4 WB",
    VIN: "CT1008",
    "Member Name": "Bomgaars",
    "Member Number": "82801",
    "Vendor Number": "1001718",
    "Order Class": "Warehouse",
    "Qty Shipped": 2,
    "Post Date": new Date("2026-05-01T00:00:00"),
    Cost: 9.88,
    "Cost Ext": 19.76,
    ...overrides,
  };
}

vi.mock("@/lib/db", () => ({
  prisma: {
    midstateImport: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    midstateSellThroughRecord: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => callback(prisma)),
  },
}));

vi.mock("@/lib/storage", () => ({
  saveUploadedFile: vi.fn(),
  deleteStoredFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => Buffer.from("file")),
}));

vi.mock("@/services/midstate/parser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/midstate/parser")>();
  return {
    ...actual,
    extractMidstatePreview: vi.fn(),
    rowsFromMidstateWorkbook: vi.fn(),
  };
});

describe("midstate imports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveUploadedFile).mockResolvedValue({
      storagePath: "storage/uploads/midstate.xlsx",
      originalName: "1001718 May 2026.xlsx",
      size: 123,
    });
    vi.mocked(extractMidstatePreview).mockReturnValue({
      sheetName: "RAW DATA",
      headers: ["VIN"],
      previewRows: [],
      totalRows: 2,
      totalQuantity: 3,
      warehouseQuantity: 2,
      directQuantity: 1,
      memberCount: 2,
      skuCount: 2,
      dateRange: { start: "2026-05-01", end: "2026-05-02" },
      periodYear: 2026,
      periodMonth: 5,
      vendorNumber: "1001718",
    });
    vi.mocked(prisma.midstateImport.findUnique).mockResolvedValue(
      midstateImport() as never,
    );
    vi.mocked(prisma.midstateImport.findMany).mockResolvedValue([]);
    vi.mocked(rowsFromMidstateWorkbook).mockReturnValue([validMidstateRow()]);
  });

  test("creates an upload preview", async () => {
    vi.mocked(prisma.midstateImport.create).mockResolvedValue(
      midstateImport() as never,
    );

    const file = new File(["data"], "1001718 May 2026.xlsx");
    const result = await createMidstateImportFromFile(file);

    expect(result.importId).toBe("import-1");
    expect(result.totalQuantity).toBe(3);
    expect(prisma.midstateImport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sheetName: "RAW DATA",
        periodYear: 2026,
        periodMonth: 5,
        vendorNumber: "1001718",
      }),
    });
  });

  test("requires explicit replacement for existing imported period", async () => {
    vi.mocked(prisma.midstateImport.findMany).mockResolvedValue([
      { id: "old-import" },
    ] as never);
    vi.mocked(rowsFromMidstateWorkbook).mockReturnValue([]);

    await expect(
      commitMidstateImport("import-1", { replaceExisting: false }),
    ).rejects.toThrow(
      "Midstate period already exists. Confirm replacement to continue.",
    );
  });

  test("commits valid rows with persisted record shape including Cost Ext", async () => {
    const result = await commitMidstateImport("import-1");

    expect(result).toMatchObject({
      importId: "import-1",
      totalRows: 1,
      importedRows: 1,
      rejectedRows: 0,
      replacedImports: 0,
      errors: [],
    });
    expect(prisma.midstateSellThroughRecord.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          importId: "import-1",
          postDate: new Date("2026-05-01T00:00:00"),
          vendorName: "Sutong Tire Resources",
          vendorNumber: "1001718",
          memberNumber: "82801",
          memberName: "Bomgaars",
          msItemNumber: "10047918",
          sku: "CT1008",
          description: "4.80/4.00-8-4 WB",
          orderClass: "Warehouse",
          quantity: 2,
          cost: 9.88,
          costExt: 19.76,
        }),
      ],
    });
    expect(prisma.midstateImport.update).toHaveBeenCalledWith({
      where: { id: "import-1" },
      data: expect.objectContaining({
        status: "imported",
        totalRows: 1,
        importedRows: 1,
        rejectedRows: 0,
        errorMessage: null,
      }),
    });
  });

  test("deletes previous imported periods when replacement is confirmed", async () => {
    vi.mocked(prisma.midstateImport.findMany).mockResolvedValue([
      { id: "old-import-1" },
      { id: "old-import-2" },
    ] as never);

    const result = await commitMidstateImport("import-1", {
      replaceExisting: true,
    });

    expect(prisma.midstateImport.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["old-import-1", "old-import-2"] } },
    });
    expect(result.replacedImports).toBe(2);
  });

  test("deletes current import records before reinserting", async () => {
    await commitMidstateImport("import-1");

    expect(prisma.midstateSellThroughRecord.deleteMany).toHaveBeenCalledWith({
      where: { importId: "import-1" },
    });
    expect(
      vi.mocked(prisma.midstateSellThroughRecord.deleteMany).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(prisma.midstateSellThroughRecord.createMany).mock
        .invocationCallOrder[0],
    );
  });

  test("writes large imports in 1,000 row batches", async () => {
    vi.mocked(rowsFromMidstateWorkbook).mockReturnValue(
      Array.from({ length: 2501 }, (_, index) =>
        validMidstateRow({
          VIN: `SKU-${index}`,
          "Member Number": `${index}`,
          "Post Date": new Date(
            `2026-05-${String((index % 28) + 1).padStart(2, "0")}T00:00:00`,
          ),
        }),
      ),
    );

    await commitMidstateImport("import-1");

    expect(prisma.midstateSellThroughRecord.createMany).toHaveBeenCalledTimes(3);
    expect(
      vi
        .mocked(prisma.midstateSellThroughRecord.createMany)
        .mock.calls.map(([input]) => input.data.length),
    ).toEqual([1000, 1000, 501]);
  });

  test("summarizes invalid rows without inserting them", async () => {
    vi.mocked(rowsFromMidstateWorkbook).mockReturnValue([
      validMidstateRow(),
      validMidstateRow({
        VIN: "",
        "Member Name": "",
        "Qty Shipped": "not-a-number",
      }),
    ]);

    const result = await commitMidstateImport("import-1");

    expect(result).toMatchObject({
      totalRows: 2,
      importedRows: 1,
      rejectedRows: 1,
      errors: [
        "Row 3: Member Name is required. SKU is required. Qty Shipped is invalid.",
      ],
    });
    expect(prisma.midstateSellThroughRecord.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ sku: "CT1008" })],
    });
    expect(prisma.midstateImport.update).toHaveBeenCalledWith({
      where: { id: "import-1" },
      data: expect.objectContaining({
        importedRows: 1,
        rejectedRows: 1,
        errorMessage:
          "Row 3: Member Name is required. SKU is required. Qty Shipped is invalid.",
      }),
    });
  });

  test("deletes a saved upload if prisma create fails", async () => {
    vi.mocked(prisma.midstateImport.create).mockRejectedValueOnce(
      new Error("db unavailable"),
    );

    await expect(
      createMidstateImportFromFile(new File(["data"], "1001718 May 2026.xlsx")),
    ).rejects.toThrow("db unavailable");

    expect(deleteStoredFile).toHaveBeenCalledWith(
      "storage/uploads/midstate.xlsx",
    );
  });
});
