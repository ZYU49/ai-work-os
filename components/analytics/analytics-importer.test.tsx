// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AnalyticsImporter } from "@/components/analytics/analytics-importer";

describe("AnalyticsImporter", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("uploads a sales file, shows preview data, and commits mapped rows", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          import: {
            importId: "import-1",
            fileName: "sales.xlsx",
            sheetName: "Detail",
            headers: ["Invoice Date", "Customer Name", "Item", "Quantity", "Total Sales"],
            previewRows: [
              {
                "Invoice Date": "2026-07-01",
                "Customer Name": "Acme Tire",
                Item: "SKU-1",
                Quantity: 10,
                "Total Sales": 2500,
              },
            ],
            totalRows: 42,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: {
            importId: "import-1",
            totalRows: 42,
            importedRows: 40,
            rejectedRows: 2,
            errors: [],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<AnalyticsImporter />);

    const file = new File(["sales"], "sales.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.change(screen.getByLabelText(/sales data file/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload sales file/i }));

    expect(await screen.findAllByText(/sales\.xlsx/i)).toHaveLength(2);
    expect(screen.getByText("Acme Tire")).toBeVisible();
    expect(screen.getByRole("combobox", { name: /^Date\s*\*/i })).toHaveValue(
      "Invoice Date",
    );
    expect(
      screen.getByRole("combobox", { name: /^Customer\s*\*/i }),
    ).toHaveValue("Customer Name");
    expect(
      screen.getByRole("combobox", { name: /^SKU \/ Item\s*\*/i }),
    ).toHaveValue("Item");
    expect(
      screen.getByRole("combobox", { name: /^Quantity\s*\*/i }),
    ).toHaveValue(
      "Quantity",
    );
    expect(
      screen.getByRole("combobox", { name: /^Revenue\s*\*/i }),
    ).toHaveValue(
      "Total Sales",
    );

    fireEvent.click(screen.getByRole("button", { name: /import rows/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/analytics/imports/import-1/commit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mapping: {
              orderDate: "Invoice Date",
              customerName: "Customer Name",
              sku: "Item",
              quantity: "Quantity",
              revenue: "Total Sales",
            },
          }),
        },
      ),
    );

    expect(
      await screen.findByText(/Imported 40 of 42 rows\. Rejected 2\./i),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /open dashboard/i }),
    ).not.toBeInTheDocument();
  });

  test("shows upload errors from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Upload an Excel or CSV file." }),
      }),
    );

    render(<AnalyticsImporter />);

    const file = new File(["bad"], "sales.txt", { type: "text/plain" });

    fireEvent.change(screen.getByLabelText(/sales data file/i), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload sales file/i }));

    expect(
      await screen.findByText("Upload an Excel or CSV file."),
    ).toBeVisible();
  });
});
