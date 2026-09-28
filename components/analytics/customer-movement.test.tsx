// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CustomerMovement, type CustomerMovementData } from "./customer-movement";

function movement(currentAvailable = true, priorAvailable = true): CustomerMovementData {
  return {
    currentYear: 2024,
    priorYear: 2023,
    defaultPeriod: "ytd",
    periods: [{value: "ytd", label: "Period"}],
    byPeriod: {
      ytd: {
        period: "ytd", label: "Period", currentAvailable, priorAvailable,
        summary: {
          currentQuantity: 0, priorQuantity: 100, quantityDiff: -100, quantityGrowth: currentAvailable && priorAvailable ? -1 : null,
          currentRevenue: 0, priorRevenue: 1000, revenueDiff: -1000, revenueGrowth: currentAvailable && priorAvailable ? -1 : null,
        },
        declining: currentAvailable && priorAvailable ? [{
          customerName: "Acme", salesperson: null,
          currentQuantity: 0, priorQuantity: 100, quantityDiff: -100, quantityGrowth: -1,
          currentRevenue: 0, priorRevenue: 1000, revenueDiff: -1000, revenueGrowth: -1,
        }] : [],
        growing: [],
      },
    },
  };
}

afterEach(cleanup);

describe("CustomerMovement", () => {
  test("uses response years in summary and table, retaining genuine zero activity", () => {
    render(<CustomerMovement data={movement()} period="ytd" onPeriodChange={vi.fn()} />);
    expect(screen.getByRole("columnheader", {name: "2024 Qty"})).toBeVisible();
    expect(screen.getByRole("columnheader", {name: "2023 Qty"})).toBeVisible();
    expect(screen.getAllByText("2024 Qty")[0].parentElement).toHaveTextContent("0");
    expect(screen.getByText("Qty Diff -100")).toBeVisible();
    expect(screen.getByText("Sales Diff -$1,000")).toBeVisible();
    expect(screen.queryByText(/Unavailable/)).not.toBeInTheDocument();
  });

  test.each([[false, true], [true, false], [false, false]])("suppresses incomplete movement comparison (%s, %s)", (current, prior) => {
    render(<CustomerMovement data={movement(current, prior)} period="ytd" onPeriodChange={vi.fn()} />);
    expect(screen.getByText(`${current ? 2023 : 2024} Qty`).parentElement).toHaveTextContent("Unavailable");
    expect(screen.getByText("Qty Diff Unavailable")).toBeVisible();
    expect(screen.getByText("Sales Diff Unavailable")).toBeVisible();
    expect(screen.getAllByText("Comparison unavailable: incomplete period coverage.")).toHaveLength(2);
    expect(screen.queryByText("No declining customers in this period.")).not.toBeInTheDocument();
    expect(screen.queryByText("No growing customers in this period.")).not.toBeInTheDocument();
  });
});
