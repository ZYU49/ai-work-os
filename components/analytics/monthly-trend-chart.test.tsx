// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MonthlyTrendChart } from "./monthly-trend-chart";

const chart = vi.hoisted(() => ({data: [] as Array<{month: string; quantity: number | null; revenue: number | null}>, connectNulls: undefined as boolean | undefined}));

vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();
  return {
    ...original,
    ResponsiveContainer: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    ComposedChart: ({data, children}: {data: typeof chart.data; children: React.ReactNode}) => {chart.data = data; return <div>{children}</div>;},
    CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Bar: () => null,
    Line: ({connectNulls}: {connectNulls?: boolean}) => {chart.connectNulls = connectNulls; return null;},
    Tooltip: ({formatter, filterNull = true}: React.ComponentProps<typeof original.Tooltip>) => {
      const point = chart.data[1];
      const payload = [
        {name: "Quantity", value: point.quantity ?? undefined, graphicalItemId: "quantity"},
        {name: "Revenue", value: point.revenue ?? undefined, graphicalItemId: "revenue"},
      ].filter((entry) => !filterNull || entry.value != null);
      return <original.DefaultTooltipContent formatter={formatter} payload={payload} label={point.month} />;
    },
  };
});

afterEach(cleanup);

describe("MonthlyTrendChart", () => {
  test("retains missing month gaps and shows unavailable tooltip values", () => {
    render(<MonthlyTrendChart data={[
      {month: "2024-01", quantity: 10, revenue: 100},
      {month: "2024-02", quantity: null, revenue: null},
      {month: "2024-03", quantity: 20, revenue: 200},
    ]} />);
    expect(chart.data[1]).toEqual({month: "2024-02", quantity: null, revenue: null});
    expect(chart.connectNulls).not.toBe(true);
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });

  test("formats genuine zero activity as zero", () => {
    render(<MonthlyTrendChart data={[
      {month: "2024-01", quantity: 10, revenue: 100},
      {month: "2024-02", quantity: 0, revenue: 0},
    ]} />);
    expect(screen.getByText("0")).toBeVisible();
    expect(screen.getByText("$0")).toBeVisible();
    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
  });
});
