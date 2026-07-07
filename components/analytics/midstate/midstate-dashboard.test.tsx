// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MidstateDashboard } from "@/components/analytics/midstate/midstate-dashboard";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Bar: () => null,
  Line: () => null,
}));

describe("MidstateDashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("loads and renders Midstate analytics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          analytics: {
            kpis: {
              ytdQuantity: 14757,
              currentMonthQuantity: 14757,
              ytdCostExt: 371155,
              latestMoMQuantityGrowth: null,
              latestYoYQuantityGrowth: null,
              activeMembers: 19,
              topMember: "Bomgaars Supply, Inc.",
              topSku: "WD1030",
            },
            monthly: [
              {
                month: "2026-05",
                quantity: 14757,
                costExt: 371155,
                momQuantityGrowth: null,
                yoyQuantityGrowth: null,
              },
            ],
            yoyComparison: [
              {
                month: "05",
                monthLabel: "May",
                currentYear: 2026,
                priorYear: 2025,
                currentQuantity: 14757,
                priorQuantity: null,
                quantityGrowth: null,
              },
            ],
            orderClassMonthly: [
              { month: "2026-05", Warehouse: 14615, Direct: 142, Other: 0 },
            ],
            topMembers: [
              {
                name: "Bomgaars Supply, Inc.",
                memberNumber: "82801",
                quantity: 5114,
                costExt: 0,
              },
            ],
            topSkus: [
              {
                name: "WD1030",
                description: "Wheel",
                quantity: 2256,
                costExt: 0,
              },
            ],
            memberHeatmap: [
              {
                memberNumber: "82801",
                memberName: "Bomgaars Supply, Inc.",
                months: { "2026-05": 5114 },
              },
            ],
            skuByMember: [],
            memberRows: [
              {
                memberNumber: "82801",
                memberName: "Bomgaars Supply, Inc.",
                quantity: 5114,
                costExt: 0,
                topSku: "WD1030",
              },
            ],
            skuRows: [
              {
                sku: "WD1030",
                description: "Wheel",
                quantity: 2256,
                costExt: 0,
                topMember: "Bomgaars Supply, Inc.",
              },
            ],
            filterOptions: {
              years: ["2026"],
              members: [{ value: "82801", label: "Bomgaars Supply, Inc." }],
              skus: ["WD1030"],
              categories: [],
              orderClasses: ["Warehouse", "Direct"],
            },
          },
        }),
      }),
    );

    render(<MidstateDashboard />);

    expect(await screen.findByText("YTD Sell-through Qty")).toBeInTheDocument();
    expect(screen.getByText("14,757")).toBeInTheDocument();
    expect(screen.getByText("Top Members")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/analytics/midstate/overview?year=2026",
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });
});
