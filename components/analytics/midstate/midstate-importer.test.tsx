// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MidstateImporter } from "@/components/analytics/midstate/midstate-importer";

describe("MidstateImporter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("uploads and imports a Midstate workbook", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          import: {
            importId: "import-1",
            fileName: "1001718 May 2026.xlsx",
            sheetName: "RAW DATA",
            totalRows: 7572,
            totalQuantity: 14757,
            warehouseQuantity: 14615,
            directQuantity: 142,
            memberCount: 19,
            skuCount: 121,
            dateRange: { start: "2026-05-01", end: "2026-05-30" },
            periodYear: 2026,
            periodMonth: 5,
            vendorNumber: "1001718",
            headers: ["VIN"],
            previewRows: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: {
            totalRows: 7572,
            importedRows: 7572,
            rejectedRows: 0,
            replacedImports: 0,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<MidstateImporter />);

    fireEvent.change(screen.getByLabelText(/midstate monthly file/i), {
      target: { files: [new File(["data"], "1001718 May 2026.xlsx")] },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /upload midstate file/i }),
    );

    expect(await screen.findByText(/14,757/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /import rows/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analytics/midstate/imports/import-1/commit",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ replaceExisting: false }),
        }),
      );
    });
    expect(
      await screen.findByText(/Imported 7,572 of 7,572 rows/),
    ).toBeInTheDocument();
  });
});
