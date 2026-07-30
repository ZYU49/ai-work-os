// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { YoYComparisonChart } from "@/components/analytics/yoy-comparison-chart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="y-axis-sample">
      {tickFormatter ? tickFormatter(1200000) : "1,200,000"}
    </div>
  ),
  Tooltip: () => null,
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
  test("formats revenue axis ticks as compact dollars", () => {
    render(<YoYComparisonChart data={yoyData} metric="revenue" />);

    expect(screen.getByTestId("y-axis-sample")).toHaveTextContent("$1.2M");
  });
});
