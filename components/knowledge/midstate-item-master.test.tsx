// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MidstateItemMaster } from "@/components/knowledge/midstate-item-master";

describe("MidstateItemMaster", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("shows one readable product row with UoM and hides zero dimensions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total: 792,
          itemGroups: ["STD ASSEMBLY"],
          items: [
            {
              itemNumber: "ASB1001S",
              description:
                "ST175/80D13 6PR HI RUN SCap & 13X4.5 5-4.5 WHITE WHEEL (8 SPOKE)",
              size: "ST175/80D13",
              brand: "HI-RUN",
              itemGroup: "STD ASSEMBLY",
              status: "Active",
              uom: "EA",
              length: 0,
              width: 0,
              height: 0,
              weight: 26.5,
            },
          ],
        }),
      }),
    );

    render(<MidstateItemMaster />);

    const row = await screen.findByRole("row", {
      name: /ASB1001S ST175\/80D13 6PR HI RUN SCap/,
    });

    expect(within(row).getByText("EA")).toBeInTheDocument();
    expect(within(row).getByText("N/A")).toBeInTheDocument();
    expect(
      within(row).getByText(
        "ST175/80D13 6PR HI RUN SCap & 13X4.5 5-4.5 WHITE WHEEL (8 SPOKE)",
      ).closest("td"),
    ).toHaveClass("whitespace-normal");
  });
});
