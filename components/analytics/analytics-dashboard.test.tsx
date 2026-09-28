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
          momRevenueGrowth: null,
          yoyQuantityGrowth: 0.1,
          yoyRevenueGrowth: 0.15,
        },
      ],
      yoyComparison: [
        {
          month: "05",
          monthLabel: "May",
          currentYear: 2026,
          priorYear: 2025,
          currentQuantity: quantity,
          priorQuantity: Math.round(quantity / 2),
          quantityGrowth: 1,
          currentRevenue: quantity * 100,
          priorRevenue: quantity * 50,
          revenueGrowth: 1,
        },
      ],
      customerMovement: {
        defaultPeriod: "05",
        periods: [
          { value: "ytd", label: "YTD" },
          { value: "05", label: "May" },
        ],
        byPeriod: {
          ytd: {
            period: "ytd",
            label: "YTD",
            summary: {
              currentQuantity: quantity,
              priorQuantity: Math.round(quantity / 2),
              quantityDiff: Math.round(quantity / 2),
              quantityGrowth: 1,
              currentRevenue: quantity * 100,
              priorRevenue: quantity * 50,
              revenueDiff: quantity * 50,
              revenueGrowth: 1,
            },
            declining: [],
            growing: [
              {
                customerName,
                salesperson: "Jamie",
                currentQuantity: quantity,
                priorQuantity: Math.round(quantity / 2),
                quantityDiff: Math.round(quantity / 2),
                quantityGrowth: 1,
                currentRevenue: quantity * 100,
                priorRevenue: quantity * 50,
                revenueDiff: quantity * 50,
                revenueGrowth: 1,
              },
            ],
          },
          "05": {
            period: "05",
            label: "May",
            summary: {
              currentQuantity: quantity,
              priorQuantity: Math.round(quantity / 2),
              quantityDiff: Math.round(quantity / 2),
              quantityGrowth: 1,
              currentRevenue: quantity * 100,
              priorRevenue: quantity * 50,
              revenueDiff: quantity * 50,
              revenueGrowth: 1,
            },
            declining: [],
            growing: [
              {
                customerName,
                salesperson: "Jamie",
                currentQuantity: quantity,
                priorQuantity: Math.round(quantity / 2),
                quantityDiff: Math.round(quantity / 2),
                quantityGrowth: 1,
                currentRevenue: quantity * 100,
                priorRevenue: quantity * 50,
                revenueDiff: quantity * 50,
                revenueGrowth: 1,
              },
            ],
          },
        },
      },
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
              momRevenueGrowth: null,
              yoyQuantityGrowth: 0.1,
              yoyRevenueGrowth: 0.12,
            },
            {
              month: "2026-06",
              quantity: 700,
              revenue: 276000,
              momQuantityGrowth: 0.4,
              momRevenueGrowth: 0.5333333333,
              yoyQuantityGrowth: 0.2,
              yoyRevenueGrowth: 0.25,
            },
          ],
          yoyComparison: [
            {
              month: "05",
              monthLabel: "May",
              currentYear: 2026,
              priorYear: 2025,
              currentQuantity: 500,
              priorQuantity: 450,
              quantityGrowth: 0.1111111111,
              currentRevenue: 180000,
              priorRevenue: 160000,
              revenueGrowth: 0.125,
            },
            {
              month: "06",
              monthLabel: "Jun",
              currentYear: 2026,
              priorYear: 2025,
              currentQuantity: 700,
              priorQuantity: 583,
              quantityGrowth: 0.2006861063,
              currentRevenue: 276000,
              priorRevenue: 220800,
              revenueGrowth: 0.25,
            },
          ],
          customerMovement: {
            defaultPeriod: "08",
            periods: [
              { value: "ytd", label: "YTD" },
              { value: "08", label: "Aug" },
            ],
            byPeriod: {
              ytd: {
                period: "ytd",
                label: "YTD",
                summary: {
                  currentQuantity: 1200,
                  priorQuantity: 1000,
                  quantityDiff: 200,
                  quantityGrowth: 0.2,
                  currentRevenue: 456000,
                  priorRevenue: 390000,
                  revenueDiff: 66000,
                  revenueGrowth: 0.1692307692,
                },
                declining: [
                  {
                    customerName: "Decliner Inc",
                    salesperson: "Allen Meng",
                    currentQuantity: 100,
                    priorQuantity: 260,
                    quantityDiff: -160,
                    quantityGrowth: -0.6153846154,
                    currentRevenue: 40000,
                    priorRevenue: 95000,
                    revenueDiff: -55000,
                    revenueGrowth: -0.5789473684,
                  },
                ],
                growing: [
                  {
                    customerName: "Grower LLC",
                    salesperson: "Bella Cui",
                    currentQuantity: 300,
                    priorQuantity: 90,
                    quantityDiff: 210,
                    quantityGrowth: 2.3333333333,
                    currentRevenue: 110000,
                    priorRevenue: 31000,
                    revenueDiff: 79000,
                    revenueGrowth: 2.5483870968,
                  },
                ],
              },
              "08": {
                period: "08",
                label: "Aug",
                summary: {
                  currentQuantity: 500,
                  priorQuantity: 650,
                  quantityDiff: -150,
                  quantityGrowth: -0.2307692308,
                  currentRevenue: 180000,
                  priorRevenue: 230000,
                  revenueDiff: -50000,
                  revenueGrowth: -0.2173913043,
                },
                declining: [
                  {
                    customerName: "Decliner Inc",
                    salesperson: "Allen Meng",
                    currentQuantity: 100,
                    priorQuantity: 260,
                    quantityDiff: -160,
                    quantityGrowth: -0.6153846154,
                    currentRevenue: 40000,
                    priorRevenue: 95000,
                    revenueDiff: -55000,
                    revenueGrowth: -0.5789473684,
                  },
                ],
                growing: [
                  {
                    customerName: "Grower LLC",
                    salesperson: "Bella Cui",
                    currentQuantity: 300,
                    priorQuantity: 90,
                    quantityDiff: 210,
                    quantityGrowth: 2.3333333333,
                    currentRevenue: 110000,
                    priorRevenue: 31000,
                    revenueDiff: 79000,
                    revenueGrowth: 2.5483870968,
                  },
                ],
              },
            },
          },
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
    expect(screen.getByText("Qty 40%")).toBeVisible();
    expect(screen.getByText(/Rev 53\.3%/i)).toBeVisible();
    expect(screen.getByText("Qty 20%")).toBeVisible();
    expect(screen.getByText(/Rev 25%/i)).toBeVisible();
    expect(screen.queryByText("Avg Unit Price")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Customers")).not.toBeInTheDocument();
    expect(screen.getByText("YoY Comparison")).toBeVisible();
    expect(screen.getByRole("link", { name: "Product YoY Table" })).toHaveAttribute(
      "href",
      "/analytics/product-yoy",
    );
    expect(screen.queryByText("YoY Quantity Comparison")).not.toBeInTheDocument();
    expect(
      screen.queryByText("YoY Sales Dollars Comparison"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Scope: 2026 YTD Jan-Jun").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Quantity" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Sales Dollars" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getAllByText("2026 Qty").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2025 Qty").length).toBeGreaterThan(0);
    expect(screen.queryByText("2026 Sales")).not.toBeInTheDocument();
    expect(screen.queryByText("2025 Sales")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sales Dollars" }));

    expect(screen.getByRole("button", { name: "Quantity" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Sales Dollars" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("2026 Sales")).toBeVisible();
    expect(screen.getByText("2025 Sales")).toBeVisible();
    expect(screen.getByText("Customer Movement")).toBeVisible();
    expect(screen.getByLabelText("Movement Period")).toHaveValue("08");
    expect(screen.getByText("Qty Diff -150")).toBeVisible();
    expect(screen.getByText("Sales Diff -$50,000")).toBeVisible();
    expect(screen.getByText("Top Declining Customers")).toBeVisible();
    expect(screen.getByText("Top Growing Customers")).toBeVisible();
    expect(screen.getByText("Decliner Inc")).toBeVisible();
    expect(screen.getByText("Grower LLC")).toBeVisible();
    expect(screen.queryByRole("columnheader", { name: "Salesperson" })).not.toBeInTheDocument();
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

  test("applies month range filters to analytics requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => createAnalyticsResponse(1200),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AnalyticsDashboard />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/analytics/sales?year=${currentYear}`,
        expect.objectContaining({ cache: "no-store" }),
      ),
    );

    fireEvent.change(screen.getByLabelText("Start Month"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("End Month"), {
      target: { value: "5" },
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/analytics/sales?year=${currentYear}&startMonth=2&endMonth=5`,
        expect.objectContaining({ cache: "no-store" }),
      ),
    );

    expect(await screen.findAllByText(`Scope: ${currentYear} Feb-May`)).not.toHaveLength(0);
  });
});
