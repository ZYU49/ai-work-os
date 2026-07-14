// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MidstateItemMaster } from "@/components/knowledge/midstate-item-master";

describe("MidstateItemMaster", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("shows one readable product row with UoM and no dimensions column", async () => {
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
    expect(
      screen.queryByRole("columnheader", { name: "Dimensions" }),
    ).not.toBeInTheDocument();
    expect(
      within(row).getByText(
        "ST175/80D13 6PR HI RUN SCap & 13X4.5 5-4.5 WHITE WHEEL (8 SPOKE)",
      ).closest("td"),
    ).toHaveClass("whitespace-normal");
  });

  test("paginates the item master at 100 rows per page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total: 101,
          itemGroups: ["L&G Tires"],
          items: Array.from({ length: 101 }, (_, index) => {
            const itemNumber = `SKU${String(index + 1).padStart(3, "0")}`;

            return {
              itemNumber,
              description: `Product ${index + 1}`,
              size: "15X6.00-6",
              brand: "HI-RUN",
              itemGroup: "L&G Tires",
              status: "Active",
              uom: "EA",
              length: 0,
              width: 0,
              height: 0,
              weight: index + 1,
            };
          }),
        }),
      }),
    );

    render(<MidstateItemMaster />);

    expect(await screen.findByText("SKU001")).toBeInTheDocument();
    expect(screen.getByText("SKU100")).toBeInTheDocument();
    expect(screen.queryByText("SKU101")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1-100 of 101")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.queryByText("SKU001")).not.toBeInTheDocument();
    expect(screen.getByText("SKU101")).toBeInTheDocument();
    expect(screen.getByText("Showing 101-101 of 101")).toBeInTheDocument();
  });
});
