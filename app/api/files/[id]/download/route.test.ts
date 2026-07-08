import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => ({
  readStoredFile: vi.fn(),
}));

vi.mock("@/services/files", () => ({
  getFileAssetById: vi.fn(),
}));

describe("file download route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the stored file with browser-friendly headers", async () => {
    const { readStoredFile } = await import("@/lib/storage");
    const { getFileAssetById } = await import("@/services/files");
    const { GET } = await import("./route");

    vi.mocked(getFileAssetById).mockResolvedValueOnce({
      id: "file-1",
      projectId: null,
      filename: "quote-123.pdf",
      url: "storage/uploads/2026/07/quote-123.pdf",
      mimeType: "application/pdf",
      size: 7,
      category: "quote",
      summary: null,
      metadata: {
        originalName: "Quote Final.pdf",
        storagePath: "storage/uploads/2026/07/quote-123.pdf",
      },
      createdAt: new Date("2026-07-08T00:00:00.000Z"),
      updatedAt: new Date("2026-07-08T00:00:00.000Z"),
      project: null,
    });
    vi.mocked(readStoredFile).mockResolvedValueOnce(Buffer.from("pdfdata"));

    const response = await GET(
      new Request("http://localhost/api/files/file-1/download"),
      { params: Promise.resolve({ id: "file-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      "Quote Final.pdf",
    );
    await expect(response.text()).resolves.toBe("pdfdata");
    expect(readStoredFile).toHaveBeenCalledWith(
      "storage/uploads/2026/07/quote-123.pdf",
    );
  });

  it("returns 404 when the file record does not exist", async () => {
    const { getFileAssetById } = await import("@/services/files");
    const { GET } = await import("./route");

    vi.mocked(getFileAssetById).mockResolvedValueOnce(null);

    const response = await GET(
      new Request("http://localhost/api/files/missing/download"),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "File not found.",
    });
  });
});
