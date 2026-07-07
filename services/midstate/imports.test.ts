import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  commitMidstateImport,
  createMidstateImportFromFile,
} from "@/services/midstate/imports";
import { prisma } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";
import {
  extractMidstatePreview,
  rowsFromMidstateWorkbook,
} from "@/services/midstate/parser";

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
  });

  test("creates an upload preview", async () => {
    vi.mocked(prisma.midstateImport.create).mockResolvedValue({
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
    });

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
    vi.mocked(prisma.midstateImport.findUnique).mockResolvedValue({
      id: "import-1",
      fileName: "1001718 May 2026.xlsx",
      storagePath: "storage/uploads/midstate.xlsx",
      sheetName: "RAW DATA",
      status: "uploaded",
      totalRows: 0,
      importedRows: 0,
      rejectedRows: 0,
      errorMessage: null,
      periodYear: 2026,
      periodMonth: 5,
      vendorNumber: "1001718",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
});
