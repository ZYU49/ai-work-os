// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
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
  topMember = "Bomgaars Supply, Inc.",
  topSku = "WD1030",
  selectedMember = null,
}: {
  topMember?: string;
  topSku?: string;
  selectedMember?: {
    memberNumber: string;
    memberName: string;
  } | null;
} = {}) {
  const rollingMonths = [
    { month: `${priorYear}-06`, quantity: 0 },
    { month: `${priorYear}-07`, quantity: 0 },
    { month: `${priorYear}-08`, quantity: 0 },
    { month: `${priorYear}-09`, quantity: 0 },
    { month: `${priorYear}-10`, quantity: 0 },
    { month: `${priorYear}-11`, quantity: 0 },
    { month: `${priorYear}-12`, quantity: 0 },
    { month: `${currentYear}-01`, quantity: 0 },
    { month: `${currentYear}-02`, quantity: 0 },
    { month: `${currentYear}-03`, quantity: 0 },
    { month: `${currentYear}-04`, quantity: 0 },
    { month: `${currentYear}-05`, quantity: 14757 },
  ];
  const memberItemBreakdown = selectedMember
    ? {
        memberNumber: selectedMember.memberNumber,
        memberName: selectedMember.memberName,
        startMonth: `${priorYear}-06`,
        endMonth: `${currentYear}-05`,
        totalQuantity: 275,
        categories: [
          {
            category: "L&G Tires",
            itemCount: 1,
            quantity: 200,
            items: [
              {
                itemNumber: "WD1030",
                description: "15X6.00-6 2PR SU05 HI-RUN",
                quantity: 200,
              },
            ],
          },
          {
            category: "STR ASSEMBLY",
            itemCount: 1,
            quantity: 75,
            items: [
              {
                itemNumber: "ASR1200",
                description: "ST175/80R13 6PR WR078(ST100) HI-RUN",
                quantity: 75,
              },
            ],
          },
        ],
      }
    : null;

  return {
    analytics: {
      kpis: {
        ytdQuantity: 14757,
        currentMonthQuantity: 14757,
        ytdCostExt: 371155,
        latestMoMQuantityGrowth: null,
        latestYoYQuantityGrowth: null,
        activeMembers: 21,
        topMember,
        topSku,
      },
      selectedMember,
      overallRollingSummary: {
        startMonth: `${priorYear}-06`,
        endMonth: `${currentYear}-05`,
        quantity: 14757,
        activeMembers: 21,
        topMember,
        topSku,
      },
      rollingMonths,
      overallRollingMonths: rollingMonths.map((point) => ({
        ...point,
        activeMembers: point.quantity > 0 ? 19 : 0,
        topMember: point.quantity > 0 ? "Bomgaars Supply, Inc." : null,
        topSku: point.quantity > 0 ? "WD1030" : null,
      })),
      memberItemBreakdown,
      itemRankings: [
        {
          rank: 1,
          itemNumber: "RAD400",
          description: "Radial tire",
          category: "STR ASSEMBLY",
          quantity: 90,
        },
        {
          rank: 2,
          itemNumber: "LG200",
          description: "Garden tire",
          category: "L&G Tires",
          quantity: 75,
        },
      ],
      monthly: rollingMonths.map((point) => ({
        ...point,
        costExt: point.quantity > 0 ? 371155 : 0,
        momQuantityGrowth: null,
        yoyQuantityGrowth: null,
      })),
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
        categories: ["L&G Tires", "STR ASSEMBLY"],
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

  test("loads and renders the rolling quantity dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createAnalyticsResponse(),
      }),
    );

    render(<MidstateDashboard />);

    expect(await screen.findByText("Executive Summary")).toBeInTheDocument();
    expect(screen.getAllByText("14,757").length).toBeGreaterThan(0);
    expect(screen.getByText("Member Rolling 12 Months")).toBeInTheDocument();
    expect(screen.getByText("Midstate Overall Rolling 12 Months")).toBeInTheDocument();
    expect(screen.queryByText("Rolling 12-Month Table")).not.toBeInTheDocument();
    expect(screen.getByText("Item Ranking by Item Group")).toBeInTheDocument();
    expect(screen.queryByText("YTD Cost Ext")).not.toBeInTheDocument();
    expect(screen.getAllByText("Members").length).toBeGreaterThan(0);
    expect(screen.queryByText("Active Members")).not.toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/analytics/midstate/overview",
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  test("sends the selected member filter and labels selected member trend", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const isMemberRequest = url.includes("memberNumber=82801");

      return {
        ok: true,
        json: async () =>
          createAnalyticsResponse({
            selectedMember: isMemberRequest
              ? {
                  memberNumber: "82801",
                  memberName: "Bomgaars Supply, Inc.",
                }
              : null,
          }),
      };
    });

    vi.stubGlobal(
      "fetch",
      fetchMock,
    );

    render(<MidstateDashboard />);

    await screen.findByRole("option", { name: "Bomgaars Supply, Inc." });
    fireEvent.change(await screen.findByLabelText("Member"), {
      target: { value: "82801" },
    });

    expect(await screen.findByText("Bomgaars Supply, Inc. Rolling 12 Months")).toBeVisible();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url]) =>
            url === "/api/analytics/midstate/overview?memberNumber=82801",
        ),
      ).toBe(true),
    );
  });

  test("member selection and reset cannot change the overall summary or its periods", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const selected = url.includes("memberNumber=atwood");
      const response = createAnalyticsResponse({
        selectedMember: selected ? { memberNumber: "atwood", memberName: "Atwood" } : null,
      });
      response.analytics.filterOptions.members.push({ value: "atwood", label: "Atwood" });
      response.analytics.overallRollingSummary = {
        startMonth: "2025-09", endMonth: "2026-08", quantity: 125012,
        activeMembers: 21, topMember: "Rolling Leader", topSku: "ROLLING-SKU",
      };
      response.analytics.overallRollingMonths = [
        { month: "2025-09", quantity: 105012, activeMembers: 21, topMember: "Rolling Leader", topSku: "ROLLING-SKU" },
        { month: "2026-08", quantity: 20000, activeMembers: 1, topMember: "Atwood", topSku: "ATWOOD-SKU" },
      ];
      response.analytics.rollingMonths = [{ month: "2026-08", quantity: selected ? 20000 : 125012 }];
      response.analytics.kpis.activeMembers = selected ? 1 : 20;
      response.analytics.kpis.topMember = selected ? "Atwood" : "YTD Leader";
      response.analytics.kpis.topSku = selected ? "ATWOOD-SKU" : "YTD-SKU";
      return { ok: true, json: async () => response };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MidstateDashboard />);
    const overall = await screen.findByRole("region", { name: "Midstate Overall" });
    const summary = overall.textContent;

    fireEvent.change(screen.getByLabelText("Member"), { target: { value: "atwood" } });
    await screen.findByText("Atwood Rolling 12 Months");
    expect(overall.textContent).toBe(summary);
    expect(within(overall).getByText("21")).toBeVisible();
    expect(within(overall).getByText("125,012")).toBeVisible();
    expect(within(overall).getByText("Rolling Leader")).toBeVisible();
    expect(within(overall).getByText("ROLLING-SKU")).toBeVisible();
    expect(within(overall).getAllByText(/2025-09 to 2026-08/).length).toBeGreaterThan(0);
    expect(within(overall).getByText(/2026-08 sell-through is 20,000 units/)).toHaveTextContent(/Rolling 12 months.*Rolling Leader.*ROLLING-SKU/);
    const member = screen.getByRole("region", { name: "Selected Member" });
    expect(within(member).getByText("Atwood")).toBeVisible();
    expect(within(member).getAllByText("20,000")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Reset Filters" }));
    await waitFor(() => expect(screen.queryByText("Loading Midstate analytics")).not.toBeInTheDocument());
    expect(screen.queryByText("Selected Member Snapshot")).not.toBeInTheDocument();
    expect(overall.textContent).toBe(summary);
  });

  test("hides stale selected snapshot, chart, and breakdown while a new member loads", async () => {
    const response = createAnalyticsResponse({ selectedMember: { memberNumber: "82801", memberName: "Bomgaars Supply, Inc." } });
    response.analytics.filterOptions.members.push({ value: "atwood", label: "Atwood" });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => response })
      .mockImplementationOnce(() => new Promise(() => {})));
    render(<MidstateDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "View Items" }));
    fireEvent.change(screen.getByLabelText("Member"), { target: { value: "atwood" } });

    expect(screen.getByText("Loading Midstate analytics")).toBeVisible();
    expect(screen.queryByText("Selected Member Snapshot")).not.toBeInTheDocument();
    expect(screen.queryByText("Bomgaars Supply, Inc. Rolling 12 Months")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View Items" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Executive Summary")).toBeVisible();
  });

  test("ignores a previous member response before the next scheduled request starts", async () => {
    const initial = createAnalyticsResponse();
    initial.analytics.filterOptions.members.push({ value: "atwood", label: "Atwood" });
    let resolvePrevious!: (response: unknown) => void;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => initial })
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePrevious = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MidstateDashboard />);
    await screen.findByText("Executive Summary");
    fireEvent.change(screen.getByLabelText("Member"), { target: { value: "82801" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByLabelText("Member"), { target: { value: "atwood" } });
      await act(async () => {
        resolvePrevious({ ok: true, json: async () => createAnalyticsResponse({
          selectedMember: { memberNumber: "82801", memberName: "Bomgaars Supply, Inc." },
        }) });
      });
      expect(screen.queryByText("Selected Member Snapshot")).not.toBeInTheDocument();
      expect(screen.getByText("Loading Midstate analytics")).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  test("groups overall summary before selected member details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          createAnalyticsResponse({
            selectedMember: {
              memberNumber: "82801",
              memberName: "Bomgaars Supply, Inc.",
            },
          }),
      }),
    );

    render(<MidstateDashboard />);

    const executiveSummary = await screen.findByText("Executive Summary");
    const overallChart = screen.getByText("Midstate Overall Rolling 12 Months");
    const selectedSnapshot = screen.getByText("Selected Member Snapshot");
    const memberChart = screen.getByText(
      "Bomgaars Supply, Inc. Rolling 12 Months",
    );

    expect(
      executiveSummary.compareDocumentPosition(overallChart) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      overallChart.compareDocumentPosition(selectedSnapshot) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      selectedSnapshot.compareDocumentPosition(memberChart) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("opens a selected member item breakdown modal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          createAnalyticsResponse({
            selectedMember: {
              memberNumber: "82801",
              memberName: "Bomgaars Supply, Inc.",
            },
          }),
      }),
    );

    render(<MidstateDashboard />);

    fireEvent.click(await screen.findByRole("button", { name: "View Items" }));

    const dialog = screen.getByRole("dialog", {
      name: "Bomgaars Supply, Inc. Item Breakdown",
    });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByText(/Rolling 12 months:/)).toHaveTextContent(
      `Rolling 12 months: ${priorYear}-06 to ${currentYear}-05 - Total Units: 275`,
    );
    expect(within(dialog).getByText("L&G Tires")).toBeVisible();
    expect(within(dialog).getAllByText(/1 items/)[0]).toHaveTextContent(
      "1 items - Total Units: 200",
    );
    expect(within(dialog).getByText("WD1030")).toBeVisible();
    expect(
      within(dialog).getByText("15X6.00-6 2PR SU05 HI-RUN"),
    ).toBeVisible();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close item breakdown" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    expect(screen.getByText(longTopSku)).toHaveClass("break-words");
  });

  test("shows item ranking by item group without the rolling table", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createAnalyticsResponse(),
      }),
    );

    render(<MidstateDashboard />);

    expect(await screen.findByLabelText("Item Group")).toBeInTheDocument();
    expect(screen.getByText("RAD400")).toBeVisible();
    expect(screen.getByText("Radial tire")).toBeVisible();
    expect(screen.getByText("90")).toBeVisible();
    expect(
      within(screen.getByRole("table")).getByRole("row", {
        name: /2 LG200 Garden tire L&G Tires 75/,
      }),
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Item Group"), {
      target: { value: "L&G Tires" },
    });

    expect(
      within(screen.getByRole("table")).getByRole("row", {
        name: /1 LG200 Garden tire L&G Tires 75/,
      }),
    ).toBeVisible();
    expect(screen.queryByText("RAD400")).not.toBeInTheDocument();
  });

  test("renders only the member filter for the rolling dashboard", () => {
    const filters: MidstateDashboardFilters = {
      memberNumber: "",
    };
    const options: MidstateFilterOptions = {
      members: [],
    };

    render(
      <MidstateFilters
        filters={filters}
        options={options}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Member")).toBeInTheDocument();
    expect(screen.queryByLabelText("Start")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("End")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("SKU")).not.toBeInTheDocument();
  });
});
