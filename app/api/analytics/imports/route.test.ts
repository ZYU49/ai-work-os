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

  it.each([
    "File could not be read as Excel or CSV.",
    "Workbook has no readable sheets.",
  ])("returns a 400 upload error for %s", async (message) => {
    const { createSalesImportFromFile } = await import("@/services/analytics/imports");
    const { POST } = await import("@/app/api/analytics/imports/route");

    vi.mocked(createSalesImportFromFile).mockRejectedValueOnce(new Error(message));

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
      error: message,
    });
  });
});
