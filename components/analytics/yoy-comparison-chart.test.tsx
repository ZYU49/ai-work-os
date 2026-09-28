// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cloneElement, type ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { YoYComparisonChart } from "@/components/analytics/yoy-comparison-chart";

const chart = vi.hoisted(() => ({data: [] as Array<Record<string, unknown>>}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ComposedChart: ({ children, data }: { children: React.ReactNode; data: typeof chart.data }) => {
    chart.data = data;
    return <div>{children}</div>;
  },
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="y-axis-sample">
      {tickFormatter ? tickFormatter(1200000) : "1,200,000"}
    </div>
  ),
  Tooltip: ({content, filterNull = true}: {content: ReactElement; filterNull?: boolean}) => cloneElement(content as ReactElement<Record<string, unknown>>, {
    active: true, label: "Jun", payload: [
      {value: chart.data[0].currentQuantity, payload: chart.data[0]},
      {value: chart.data[0].priorQuantity, payload: chart.data[0]},
    ].filter((entry) => !filterNull || entry.value !== null),
  }),
  Bar: () => null,
}));

const yoyData = [
  {
    monthLabel: "Jun",
    currentYear: 2026,
    priorYear: 2025,
    currentQuantity: 700,
    priorQuantity: 583,
    quantityGrowth: 0.2,
    currentRevenue: 1200000,
    priorRevenue: 900000,
    revenueGrowth: 0.333,
  },
];

describe("YoYComparisonChart", () => {
  afterEach(cleanup);
  test("formats revenue axis ticks as compact dollars", () => {
    render(<YoYComparisonChart data={yoyData} metric="revenue" />);

    expect(screen.getByTestId("y-axis-sample")).toHaveTextContent("$1.2M");
  });

  test.each(["quantity", "revenue"] as const)("shows missing years as unavailable in the %s tooltip", (metric) => {
    render(<YoYComparisonChart data={[{...yoyData[0], currentQuantity: null, priorQuantity: null, currentRevenue: null, priorRevenue: null, quantityGrowth: null, revenueGrowth: null}]} metric={metric} />);
    expect(screen.getByText("2026: Unavailable")).toBeVisible();
    expect(screen.getByText("2025: Unavailable")).toBeVisible();
    expect(screen.getByText("YoY: N/A")).toBeVisible();
    expect(chart.data[0].currentQuantity).toBeNull();
  });

  test("retains zero activity while labeling the missing comparison year", () => {
    render(<YoYComparisonChart data={[{...yoyData[0], currentQuantity: 0, priorQuantity: null, quantityGrowth: null}]} />);
    expect(screen.getByText("2026: 0")).toBeVisible();
    expect(screen.getByText("2025: Unavailable")).toBeVisible();
  });
});
