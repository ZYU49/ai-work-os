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
              fobCost: null,
            },
          ],
        }),
      }),
    );

    render(<MidstateItemMaster />);

    await screen.findByText("ASB1001S");
    expect(screen.getAllByText("Midstates FOB")).toHaveLength(2);
    const row = await screen.findByRole("row", {
      name: /ASB1001S ST175\/80D13 6PR HI RUN SCap/,
    });

    expect(within(row).getByText("EA")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Dimensions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "FOB Cost" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Cost Source" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Weight" }),
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
              fobCost:
                index === 0
                  ? {
                      sourceSheet: "L&G",
                      currentFob: 6.66,
                      increase: -0.04,
                      effectiveFob: 6.39,
                      effectiveDate: "2025-05-15",
                      containerQty40: 4400,
                      containerQty20: null,
                    }
                  : null,
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

  test("shows FOB cost and can request only items with FOB cost", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 1,
        itemGroups: ["L&G Tires"],
        items: [
          {
            itemNumber: "WD1030",
            description: "15X6.00-6 2PR SU05 HI-RUN",
            size: "15X6.00-6",
            brand: "HI-RUN",
            itemGroup: "L&G Tires",
            status: "Active",
            uom: "EA",
            length: 13,
            width: 13,
            height: 5,
            weight: 5.4,
            fobCost: {
              sourceSheet: "L&G",
              currentFob: 6.66,
              increase: -0.04,
              effectiveFob: 6.39,
              effectiveDate: "2025-05-15",
              containerQty40: 4400,
              containerQty20: null,
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MidstateItemMaster />);

    expect(await screen.findByText("WD1030")).toBeInTheDocument();
    expect(screen.queryByText("$6.39")).not.toBeInTheDocument();
    expect(screen.queryByText("L&G (2025-05-15)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Midstates FOB"));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/knowledge/midstate-items?hasFobCost=true",
      { cache: "no-store" },
    );
  });
});
