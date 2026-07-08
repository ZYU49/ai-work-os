// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MidstateDashboard } from "@/components/analytics/midstate/midstate-dashboard";
import {
  MidstateFilters,
  type MidstateDashboardFilters,
  type MidstateFilterOptions,
} from "@/components/analytics/midstate/midstate-filters";

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
  Bar: ({ name }: { name?: string }) => (name ? <span>{name}</span> : null),
  Line: ({ name }: { name?: string }) => (name ? <span>{name}</span> : null),
}));

const currentYear = String(new Date().getFullYear());
const priorYear = String(Number(currentYear) - 1);

function createAnalyticsResponse({
  monthly = [
    {
      month: `${currentYear}-05`,
      quantity: 14757,
      costExt: 371155,
      momQuantityGrowth: null,
      yoyQuantityGrowth: null,
    },
  ],
  topMember = "Bomgaars Supply, Inc.",
  topSku = "WD1030",
}: {
  monthly?: Array<{
    month: string;
    quantity: number;
    costExt: number;
    momQuantityGrowth: number | null;
    yoyQuantityGrowth: number | null;
  }>;
  topMember?: string;
  topSku?: string;
} = {}) {
  return {
    analytics: {
      kpis: {
        ytdQuantity: 14757,
        currentMonthQuantity: 14757,
        ytdCostExt: 371155,
        latestMoMQuantityGrowth: null,
        latestYoYQuantityGrowth: null,
        activeMembers: 19,
        topMember,
        topSku,
      },
      monthly,
      yoyComparison: [
        {
          month: "05",
          monthLabel: "May",
          currentYear: Number(currentYear),
          priorYear: Number(priorYear),
          currentQuantity: 14757,
          priorQuantity: null,
          quantityGrowth: null,
        },
      ],
      orderClassMonthly: [
        { month: `${currentYear}-05`, Warehouse: 14615, Direct: 142, Other: 0 },
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
          months: { [`${currentYear}-05`]: 5114 },
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
        years: [currentYear],
        members: [{ value: "82801", label: "Bomgaars Supply, Inc." }],
        skus: ["WD1030"],
        categories: [],
        orderClasses: ["Warehouse", "Direct"],
      },
    },
  };
}

describe("MidstateDashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("loads and renders Midstate analytics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createAnalyticsResponse(),
      }),
    );

    render(<MidstateDashboard />);

    expect(await screen.findByText("YTD Sell-through Qty")).toBeInTheDocument();
    expect(screen.getByText("14,757")).toBeInTheDocument();
    expect(screen.getByText("Top Members")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/analytics/midstate/overview?year=${currentYear}`,
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  test("labels cost ext monthly data without sales or revenue wording", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createAnalyticsResponse(),
      }),
    );

    render(<MidstateDashboard />);

    expect((await screen.findAllByText("Cost Ext")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Revenue")).not.toBeInTheDocument();
  });

  test("uses a Midstate monthly empty state when monthly rows are absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createAnalyticsResponse({ monthly: [] }),
      }),
    );

    render(<MidstateDashboard />);

    expect(await screen.findByText("No Midstate monthly data yet.")).toBeVisible();
    expect(screen.queryByText(/sales data/i)).not.toBeInTheDocument();
  });

  test("keeps long Top Member and Top SKU values inside their KPI cards", async () => {
    const longTopMember =
      "Midstate Member With An Exceptionally Long Legal Entity Name That Should Not Overflow";
    const longTopSku =
      "MIDSTATE-SKU-WITH-A-VERY-LONG-UNBROKEN-IDENTIFIER-1234567890";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          createAnalyticsResponse({ topMember: longTopMember, topSku: longTopSku }),
      }),
    );

    render(<MidstateDashboard />);

    expect(await screen.findByText(longTopMember)).toHaveClass("break-words");
    expect(screen.getByText(longTopSku)).toHaveClass("break-all");
  });

  test("uses clear month filter placeholder labels", () => {
    const filters: MidstateDashboardFilters = {
      year: currentYear,
      startMonth: "",
      endMonth: "",
      memberNumber: "",
      sku: "",
      category: "",
      orderClass: "",
    };
    const options: MidstateFilterOptions = {
      years: [currentYear],
      members: [],
      skus: [],
      categories: [],
      orderClasses: [],
    };

    render(
      <MidstateFilters
        filters={filters}
        options={options}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const startMonth = screen.getByLabelText("Start");
    const endMonth = screen.getByLabelText("End");

    expect(
      within(startMonth).getByRole("option", { name: "No start limit" }),
    ).toHaveValue("");
    expect(
      within(endMonth).getByRole("option", { name: "No end limit" }),
    ).toHaveValue("");
    expect(within(startMonth).getAllByRole("option", { name: "Jan" })).toHaveLength(1);
    expect(within(endMonth).getAllByRole("option", { name: "Dec" })).toHaveLength(1);
  });
});
