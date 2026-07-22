// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { AnalyticsSectionSwitcher } from "@/components/analytics/analytics-section-switcher";

describe("AnalyticsSectionSwitcher", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders shortcuts for all analytics sections", () => {
    render(<AnalyticsSectionSwitcher current="sales" />);

    expect(screen.getByRole("link", { name: "Sales Analytics" })).toHaveAttribute(
      "href",
      "/analytics",
    );
    expect(
      screen.getByRole("link", { name: "Midstate Member Analytics" }),
    ).toHaveAttribute("href", "/analytics/midstate");
    expect(screen.getByRole("link", { name: "Warehouse Overdue" })).toHaveAttribute(
      "href",
      "/analytics/warehouse-overdue",
    );
  });

  test("marks the current analytics section", () => {
    render(<AnalyticsSectionSwitcher current="warehouse-overdue" />);

    expect(screen.getByRole("link", { name: "Warehouse Overdue" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Sales Analytics" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
