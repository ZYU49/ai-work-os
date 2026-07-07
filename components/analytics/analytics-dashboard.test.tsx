// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Bar: () => null,
  Line: () => null,
}));

function createAnalyticsResponse(quantity: number, customerName = "Acme Tire") {
  return {
    analytics: {
      kpis: {
        ytdQuantity: quantity,
        ytdRevenue: quantity * 100,
        averageUnitPrice: 100,
        activeCustomers: 14,
      },
      monthly: [
        {
          month: "2026-05",
          quantity,
          revenue: quantity * 100,
          momQuantityGrowth: null,
          yoyQuantityGrowth: 0.1,
        },
      ],
      topCustomers: [
        { name: customerName, quantity, revenue: quantity * 100 },
      ],
      topCategories: [{ name: "PCR", quantity, revenue: quantity * 100 }],
      topSkus: [{ name: "SKU-1", quantity, revenue: quantity * 100 }],
      salespeople: [{ name: "Jamie", quantity, revenue: quantity * 100 }],
      filterOptions: {
        years: ["2025", "2026"],
        salespeople: ["Jamie"],
        customers: [customerName],
        categories: ["PCR"],
        skus: ["SKU-1"],
        states: ["TX"],
        members: ["Member A"],
      },
    },
  };
}

describe("AnalyticsDashboard", () => {
  const currentYear = String(new Date().getFullYear());

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("loads and renders sales analytics from the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        analytics: {
          kpis: {
            ytdQuantity: 1200,
            ytdRevenue: 456000,
            averageUnitPrice: 380,
            activeCustomers: 14,
          },
          monthly: [
            {
              month: "2026-05",
              quantity: 500,
              revenue: 180000,
              momQuantityGrowth: null,
              yoyQuantityGrowth: 0.1,
            },
            {
              month: "2026-06",
              quantity: 700,
              revenue: 276000,
              momQuantityGrowth: 0.4,
              yoyQuantityGrowth: 0.2,
            },
          ],
          topCustomers: [{ name: "Acme Tire", quantity: 700, revenue: 276000 }],
          topCategories: [{ name: "PCR", quantity: 650, revenue: 250000 }],
          topSkus: [{ name: "SKU-1", quantity: 600, revenue: 240000 }],
          salespeople: [{ name: "Jamie", quantity: 900, revenue: 320000 }],
          filterOptions: {
            years: ["2025", "2026"],
            salespeople: ["Jamie"],
            customers: ["Acme Tire"],
            categories: ["PCR"],
            skus: ["SKU-1"],
            states: ["TX"],
            members: ["Member A"],
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AnalyticsDashboard />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/analytics/sales?year=${currentYear}`,
        expect.objectContaining({ cache: "no-store" }),
      ),
    );

    expect((await screen.findAllByText("1,200")).length).toBeGreaterThan(0);
    expect(screen.getByText("$456,000")).toBeVisible();
    expect(screen.getByText("40%")).toBeVisible();
    expect(screen.getByText("14")).toBeVisible();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeEnabled();
    expect(screen.getAllByText("Acme Tire").length).toBeGreaterThan(0);
    expect(screen.getByText("Salesperson Split")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  test("shows API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Unable to load sales analytics." }),
      }),
    );

    render(<AnalyticsDashboard />);

    expect(
      await screen.findByText("Unable to load sales analytics."),
    ).toBeVisible();
  });

  test("ignores stale responses when filters change mid-request", async () => {
    let resolveInitial:
      | ((value: { ok: boolean; json: () => Promise<ReturnType<typeof createAnalyticsResponse>> }) => void)
      | undefined;
    let resolveFiltered:
      | ((value: { ok: boolean; json: () => Promise<ReturnType<typeof createAnalyticsResponse>> }) => void)
      | undefined;

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInitial = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFiltered = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<AnalyticsDashboard />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/analytics/sales?year=${currentYear}`,
        expect.objectContaining({ cache: "no-store" }),
      ),
    );

    fireEvent.change(screen.getByLabelText("Year"), {
      target: { value: "2025" },
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analytics/sales?year=2025",
        expect.objectContaining({ cache: "no-store" }),
      ),
    );

    await act(async () => {
      resolveFiltered?.({
        ok: true,
        json: async () => createAnalyticsResponse(900, "Beta Tire"),
      });
    });

    expect((await screen.findAllByText("Beta Tire")).length).toBeGreaterThan(0);

    await act(async () => {
      resolveInitial?.({
        ok: true,
        json: async () => createAnalyticsResponse(1200, "Acme Tire"),
      });
    });

    await waitFor(() => {
      expect(screen.getAllByText("Beta Tire").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Acme Tire")).toHaveLength(0);
    });
  });
});
