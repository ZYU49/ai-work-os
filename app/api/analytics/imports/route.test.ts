import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => ({
  getContentLengthUploadError: vi.fn(() => null),
  getMaxUploadBytes: vi.fn(() => 10_000_000),
  isUploadOverLimit: vi.fn(() => false),
}));

vi.mock("@/services/analytics/imports", () => ({
  createSalesImportFromFile: vi.fn(),
  listSalesImports: vi.fn(),
}));

describe("analytics imports route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a 400 upload error for unreadable workbook files", async () => {
    const { createSalesImportFromFile } = await import("@/services/analytics/imports");
    const { POST } = await import("@/app/api/analytics/imports/route");

    vi.mocked(createSalesImportFromFile).mockRejectedValueOnce(
      new Error("File could not be read as Excel or CSV."),
    );

    const formData = new FormData();
    formData.set(
      "file",
      new File(["bad"], "sales.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/analytics/imports", {
        method: "POST",
        headers: { "content-length": "3" },
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "File could not be read as Excel or CSV.",
    });
  });
});
