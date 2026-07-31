// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ProductYoYDashboard } from "@/components/analytics/product-yoy-dashboard";

function createProductYoYResponse() {
  return {
    analytics: {
      currentYear: 2026,
      priorYear: 2025,
      months: [1, 2, 3, 4, 5, 6],
      filterOptions: {
        customers: ["Customer A", "Customer B"],
      },
      rows: [
        {
          sku: "SKU-A",
          description: "Alpha tire",
          currentQuantity: 100,
          priorQuantity: 80,
          quantityDiff: 20,
          quantityGrowth: 0.25,
        },
        {
          sku: "SKU-B",
          description: "Bravo tire",
          currentQuantity: 50,
          priorQuantity: 0,
          quantityDiff: 50,
          quantityGrowth: null,
        },
        {
          sku: "SKU-C",
          description: "Charlie tire",
          currentQuantity: 0,
          priorQuantity: 80,
          quantityDiff: -80,
          quantityGrowth: -1,
        },
      ],
    },
  };
}

describe("ProductYoYDashboard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("loads product YoY rows and defaults to current-year quantity ranking", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => createProductYoYResponse(),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductYoYDashboard />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analytics/product-yoy",
        expect.objectContaining({ cache: "no-store" }),
      ),
    );

    expect(await screen.findByText("Product YoY Performance")).toBeVisible();
    expect(screen.getByText("SKU / Item")).toBeVisible();
    expect(screen.getByText("Description")).toBeVisible();
    expect(screen.getByText("2026 Qty")).toBeVisible();
    expect(screen.getByText("2025 Qty")).toBeVisible();
    expect(screen.getByText("Qty Diff")).toBeVisible();
    expect(screen.getByText("Qty YoY %")).toBeVisible();
    expect(screen.getByText("Scope: 2026 YTD Jan-Jun")).toBeVisible();
    expect(screen.getByLabelText("Customer")).toBeVisible();

    const firstSku = screen.getAllByTestId("product-yoy-sku")[0];
    expect(firstSku).toHaveTextContent("SKU-A");
    expect(screen.getByText("25%")).toBeVisible();
    expect(screen.getByText("N/A")).toBeVisible();
    expect(screen.getByText("-100%")).toBeVisible();
  });

  test("filters products by SKU or description", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createProductYoYResponse(),
      }),
    );

    render(<ProductYoYDashboard />);

    await screen.findByText("SKU-A");
    fireEvent.change(screen.getByLabelText("Search products"), {
      target: { value: "bravo" },
    });

    expect(screen.getByText("SKU-B")).toBeVisible();
    expect(screen.queryByText("SKU-A")).not.toBeInTheDocument();
    expect(screen.queryByText("SKU-C")).not.toBeInTheDocument();
  });

  test("reloads item YoY for the selected customer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createProductYoYResponse(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: {
            currentYear: 2026,
            priorYear: 2025,
            months: [1, 2, 3, 4, 5, 6],
            filterOptions: {
              customers: ["Customer A", "Customer B"],
            },
            rows: [
              {
                sku: "SKU-A",
                description: "Alpha tire",
                currentQuantity: 25,
                priorQuantity: 10,
                quantityDiff: 15,
                quantityGrowth: 1.5,
              },
            ],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductYoYDashboard />);

    await screen.findByText("SKU-A");
    fireEvent.change(screen.getByLabelText("Customer"), {
      target: { value: "Customer B" },
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analytics/product-yoy?customerName=Customer+B",
        expect.objectContaining({ cache: "no-store" }),
      ),
    );

    expect(await screen.findByText("Scope: 2026 YTD Jan-Jun · Customer: Customer B")).toBeVisible();
    expect(screen.getByText("25")).toBeVisible();
    expect(screen.getByText("10")).toBeVisible();
  });
});
