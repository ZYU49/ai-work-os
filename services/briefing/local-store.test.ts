// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";
import {
  addBriefing,
  defaultBriefing,
  readBriefings,
  SALES_DESK_BRIEFING_STORAGE_KEY,
} from "@/services/briefing/local-store";

describe("briefing local store", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test("stores newest briefing first and keeps recent history", () => {
    addBriefing({
      kind: "sales",
      title: "Sales data updated",
      message: "June sales data is ready.",
      createdAt: "2026-07-27T13:00:00.000Z",
      href: "/analytics",
    });
    addBriefing({
      kind: "midstate",
      title: "Midstate data updated",
      message: "June Midstate rolling view is ready.",
      createdAt: "2026-07-27T14:00:00.000Z",
      href: "/analytics/midstate",
    });

    expect(readBriefings()).toEqual([
      expect.objectContaining({
        kind: "midstate",
        title: "Midstate data updated",
        message: "June Midstate rolling view is ready.",
        href: "/analytics/midstate",
      }),
      expect.objectContaining({
        kind: "sales",
        title: "Sales data updated",
        message: "June sales data is ready.",
        href: "/analytics",
      }),
    ]);
  });

  test("dispatches an update event when a briefing is added", () => {
    const listener = vi.fn();
    window.addEventListener("salesdesk:briefing-updated", listener);

    addBriefing({
      kind: "warehouse",
      title: "Warehouse overdue updated",
      message: "Anderson report is ready.",
      createdAt: "2026-07-27T15:00:00.000Z",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SALES_DESK_BRIEFING_STORAGE_KEY)).toContain(
      "Warehouse overdue updated",
    );
  });

  test("announces September Midstate data and its rolling period by default", () => {
    const briefing = defaultBriefing(new Date("2026-10-16T15:00:00.000Z"));

    expect(briefing).toMatchObject({
      kind: "midstate",
      title: "September Midstate data updated",
      message:
        "Midstate September data is ready. Review October 2025-September 2026 rolling quantities, member item details, and Item Group rankings.",
      href: "/analytics/midstate",
    });
  });
});
