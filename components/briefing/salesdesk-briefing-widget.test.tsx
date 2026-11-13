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

  test("shows the published update ahead of older saved briefings and keeps history", () => {
    addBriefing({
      kind: "sales",
      title: "Sales data updated",
      message: "July sales data is ready for YTD and monthly comparison.",
      createdAt: "2026-07-27T13:00:00.000Z",
      href: "/analytics",
    });

    render(<SalesDeskBriefingWidget />);

    expect(screen.getByRole("img", { name: "Sutong reporter" })).toHaveAttribute(
      "src",
      expect.stringContaining("sutong-reporter.png"),
    );
    expect(screen.queryByText("ST")).not.toBeInTheDocument();
    expect(screen.getByText("SalesDesk Briefing")).toBeVisible();
    expect(screen.getByText("Midstates October data updated")).toBeVisible();
    expect(
      screen.getByText("October 2026 Midstates data is now available. Rolling 12 months: November 2025-October 2026."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Open briefing calendar" }));

    expect(screen.getByText("Recent updates")).toBeVisible();
    expect(screen.getByText("Calendar")).toBeVisible();
    expect(screen.getByText("Sales data updated")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Open related page" }).map(
      (link) => link.getAttribute("href"),
    )).toEqual(["/analytics/midstate", "/analytics"]);
  });

  test("allows later imports to become the latest update", () => {
    addBriefing({
      kind: "sales",
      title: "Newer sales update",
      message: "A later report is ready.",
      createdAt: "2026-11-14T13:00:00.000Z",
      href: "/analytics",
    });

    render(<SalesDeskBriefingWidget />);

    expect(screen.getByText("Newer sales update")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Open briefing calendar" }));
    expect(screen.getByText("Midstates October data updated")).toBeVisible();
  });
});
