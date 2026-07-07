import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => ({
  getContentLengthUploadError: vi.fn(() => null),
  getMaxUploadBytes: vi.fn(() => 10_000_000),
  isUploadOverLimit: vi.fn(() => false),
}));

vi.mock("@/services/midstate/imports", async () => {
  const { z } = await import("zod");

  return {
    createMidstateImportFromFile: vi.fn(),
    listMidstateImports: vi.fn(),
    commitMidstateImport: vi.fn(),
    midstateCommitSchema: z.object({
      replaceExisting: z.boolean().optional().default(false),
    }),
  };
});

vi.mock("@/services/midstate/metrics", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/midstate/metrics")>();

  return {
    ...actual,
    getMidstateAnalytics: vi.fn(),
  };
});

describe("midstate analytics routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when upload file is missing", async () => {
    const { POST } = await import("@/app/api/analytics/midstate/imports/route");

    const response = await POST(
      new Request("http://localhost/api/analytics/midstate/imports", {
        method: "POST",
        headers: { "content-length": "0" },
        body: new FormData(),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "A Midstate file is required.",
    });
  });

  it("returns 400 for an invalid workbook", async () => {
    const { createMidstateImportFromFile } = await import(
      "@/services/midstate/imports"
    );
    const { POST } = await import("@/app/api/analytics/midstate/imports/route");

    vi.mocked(createMidstateImportFromFile).mockRejectedValueOnce(
      new Error("File could not be read as a Midstate Excel workbook."),
    );

    const formData = new FormData();
    formData.set(
      "file",
      new File(["bad"], "midstate.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/analytics/midstate/imports", {
        method: "POST",
        headers: { "content-length": "3" },
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "File could not be read as a Midstate Excel workbook.",
    });
  });

  it("returns 400 for malformed commit JSON", async () => {
    const { commitMidstateImport } = await import("@/services/midstate/imports");
    const { POST } = await import(
      "@/app/api/analytics/midstate/imports/[id]/commit/route"
    );

    const response = await POST(
      new Request("http://localhost/api/analytics/midstate/imports/import-1/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      { params: Promise.resolve({ id: "import-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Request body must be valid JSON.",
    });
    expect(commitMidstateImport).not.toHaveBeenCalled();
  });

  it("returns 409 for a duplicate-period commit conflict", async () => {
    const { commitMidstateImport } = await import("@/services/midstate/imports");
    const { POST } = await import(
      "@/app/api/analytics/midstate/imports/[id]/commit/route"
    );

    vi.mocked(commitMidstateImport).mockRejectedValueOnce(
      new Error("Midstate period already exists. Confirm replacement to continue."),
    );

    const response = await POST(
      new Request("http://localhost/api/analytics/midstate/imports/import-1/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      { params: Promise.resolve({ id: "import-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Midstate period already exists. Confirm replacement to continue.",
    });
  });

  it("returns 400 for invalid overview filters", async () => {
    const { getMidstateAnalytics } = await import(
      "@/services/midstate/metrics"
    );
    const { GET } = await import("@/app/api/analytics/midstate/overview/route");

    const response = await GET(
      new Request(
        "http://localhost/api/analytics/midstate/overview?startMonth=12&endMonth=1",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Midstate analytics filters are invalid.",
    });
    expect(getMidstateAnalytics).not.toHaveBeenCalled();
  });
});
