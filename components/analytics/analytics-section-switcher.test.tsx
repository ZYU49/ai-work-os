// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { AnalyticsSectionSwitcher } from "@/components/analytics/analytics-section-switcher";

describe("AnalyticsSectionSwitcher", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders only the retained analytics sections", () => {
    render(<AnalyticsSectionSwitcher current="sales" />);

    expect(screen.getByRole("link", { name: "Sales Analytics" })).toHaveAttribute(
      "href",
      "/analytics",
    );
    expect(
      screen.getByRole("link", { name: "Midstate Member Analytics" }),
    ).toHaveAttribute("href", "/analytics/midstate");
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Warehouse Overdue" })).not.toBeInTheDocument();
  });

  test("marks the current analytics section", () => {
    render(<AnalyticsSectionSwitcher current="midstate" />);

    expect(screen.getByRole("link", { name: "Midstate Member Analytics" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Sales Analytics" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
