// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { SalesDeskBriefingWidget } from "@/components/briefing/salesdesk-briefing-widget";
import { addBriefing } from "@/services/briefing/local-store";

describe("SalesDeskBriefingWidget", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  test("shows the latest briefing from Sutong reporter and expands history", () => {
    addBriefing({
      kind: "sales",
      title: "Sales data updated",
      message: "July sales data is ready for YTD and monthly comparison.",
      createdAt: "2026-07-27T13:00:00.000Z",
      href: "/analytics",
    });

    render(<SalesDeskBriefingWidget />);

    expect(screen.getByText("ST")).toBeVisible();
    expect(screen.getByText("SalesDesk Briefing")).toBeVisible();
    expect(screen.getByText("Sales data updated")).toBeVisible();
    expect(
      screen.getByText("July sales data is ready for YTD and monthly comparison."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Open briefing calendar" }));

    expect(screen.getByText("Recent updates")).toBeVisible();
    expect(screen.getByText("Calendar")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open related page" })).toHaveAttribute(
      "href",
      "/analytics",
    );
  });
});
