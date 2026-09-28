// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ProductYoYDashboard } from "@/components/analytics/product-yoy-dashboard";

const xlsxMock = vi.hoisted(() => ({
  bookAppendSheet: vi.fn(),
  bookNew: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
  jsonToSheet: vi.fn(() => ({})),
  writeFile: vi.fn(),
}));

vi.mock("xlsx", () => ({
  utils: {
    book_append_sheet: xlsxMock.bookAppendSheet,
    book_new: xlsxMock.bookNew,
    json_to_sheet: xlsxMock.jsonToSheet,
  },
  writeFile: xlsxMock.writeFile,
}));

function createProductYoYResponse() {
  return {
    analytics: {
      currentYear: 2026,
      priorYear: 2025,
      months: [1, 2, 3, 4, 5, 6],
      period: {
        currentYear: 2026,
        priorYear: 2025,
        startMonth: 1,
        endMonth: 6,
        months: [1, 2, 3, 4, 5, 6],
        kind: "ytd" as "month" | "ytd" | "period",
        availableCurrentMonths: [1, 2, 3, 4, 5, 6],
        availablePriorMonths: [1, 2, 3, 4, 5, 6],
        missingCurrentMonths: [] as number[],
        missingPriorMonths: [] as number[],
      },
      summary: {
        currentQuantity: 150,
        priorQuantity: 160,
        quantityDiff: -10,
        quantityGrowth: -0.0625,
        currentRevenue: 2250,
        priorRevenue: 1600,
        revenueDiff: 650,
        revenueGrowth: 0.40625,
        lineItemCount: 3,
        newItemCount: 1,
        lostItemCount: 1,
      },
      filterOptions: {
        customers: ["Customer A", "Customer B"],
      },
      rows: [
        {
          sku: "SKU-A",
          description: "Alpha tire",
          currentQuantity: 100,
          priorQuantity: 80,
          quantityDiff: 20,
          quantityGrowth: 0.25,
        },
        {
          sku: "SKU-B",
          description: "Bravo tire",
          currentQuantity: 50,
          priorQuantity: 0,
          quantityDiff: 50,
          quantityGrowth: null,
        },
        {
          sku: "SKU-C",
          description: "Charlie tire",
          currentQuantity: 0,
          priorQuantity: 80,
          quantityDiff: -80,
          quantityGrowth: -1,
        },
      ],
    },
  };
}

function deferredResponse() {
  let resolve!: (response: { ok: boolean; json: () => Promise<unknown> }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function successfulResponse(data = createProductYoYResponse()) {
  return { ok: true, json: async () => data };
}

describe("ProductYoYDashboard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  test("hides previous scope and results while keeping disabled search and export during a customer reload", async () => {
    const pending = deferredResponse();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(successfulResponse())
      .mockReturnValueOnce(pending.promise));
    render(<ProductYoYDashboard />);
    await screen.findByText("SKU-A");
    fireEvent.change(screen.getByLabelText("Search products"), { target: { value: "Alpha" } });

    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "Customer B" } });

    expect(screen.getByRole("button", { name: "Export Excel" })).toBeDisabled();
    expect(screen.queryByText("Scope: 2026 YTD Jan-Jun")).not.toBeInTheDocument();
    expect(screen.getByText("Loading product YoY scope")).toBeVisible();
    expect(screen.queryByText("Overall Summary")).not.toBeInTheDocument();
    expect(screen.queryByText(/Item Detail.*line items/)).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("SKU-A")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search products")).toBeVisible();
    expect(screen.getByLabelText("Search products")).toBeDisabled();
    expect(screen.getByLabelText("Search products")).toHaveValue("Alpha");
    expect(screen.queryByText(/Scope:.*Customer B/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("option").map((option) => option.textContent))
      .toEqual(["All Customers", "Customer A", "Customer B"]);
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(xlsxMock.writeFile).not.toHaveBeenCalled();

    await act(async () => pending.resolve(successfulResponse()));
    expect(screen.getByText("Scope: 2026 YTD Jan-Jun · Customer: Customer B")).toBeVisible();
    expect(screen.getByText("Overall Summary")).toBeVisible();
    expect(screen.getByText("SKU-A")).toBeVisible();
    expect(screen.queryByText("SKU-B")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search products")).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(xlsxMock.writeFile).toHaveBeenCalledWith(expect.anything(), "Product_YoY_Customer_B_2026_YTD_Jan-Jun.xlsx");
  });

  test.each(["success", "failure"])("ignores an older request's late %s", async (outcome) => {
    const older = deferredResponse();
    const newest = deferredResponse();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(successfulResponse())
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newest.promise));
    render(<ProductYoYDashboard />);
    await screen.findByText("SKU-A");
    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "Customer A" } });
    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "Customer B" } });
    const latestData = createProductYoYResponse();
    latestData.analytics.rows[0].sku = "NEWEST-SKU";
    await act(async () => newest.resolve(successfulResponse(latestData)));
    await act(async () => {
      if (outcome === "success") older.resolve(successfulResponse());
      else older.reject(new Error("Obsolete failure"));
    });

    expect(screen.getByText("NEWEST-SKU")).toBeVisible();
    expect(screen.queryByText("SKU-A")).not.toBeInTheDocument();
    expect(screen.queryByText("Obsolete failure")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(xlsxMock.jsonToSheet).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ "SKU / Item": "NEWEST-SKU" }),
    ]));
    expect(xlsxMock.writeFile).toHaveBeenCalledWith(expect.anything(), "Product_YoY_Customer_B_2026_YTD_Jan-Jun.xlsx");
  });

  test("failed customer reload removes stale results but preserves every customer option", async () => {
    const pending = deferredResponse();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(successfulResponse())
      .mockReturnValueOnce(pending.promise));
    render(<ProductYoYDashboard />);
    await screen.findByText("SKU-A");
    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "Customer B" } });
    await act(async () => pending.resolve({ ok: false, json: async () => ({ error: "Customer load failed" }) }));
    expect(screen.getByRole("status")).toHaveTextContent("Customer load failed");
    expect(screen.queryByText("SKU-A")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export Excel" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("option").map((option) => option.textContent))
      .toEqual(["All Customers", "Customer A", "Customer B"]);
    expect(screen.getByLabelText("Customer")).toHaveValue("Customer B");
    expect(xlsxMock.writeFile).not.toHaveBeenCalled();
  });

  test("returning to the resolved customer still waits for its newest request", async () => {
    const older = deferredResponse();
    const newest = deferredResponse();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(successfulResponse())
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newest.promise));
    render(<ProductYoYDashboard />);
    await screen.findByText("SKU-A");
    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "Customer A" } });
    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "" } });
    await act(async () => older.resolve(successfulResponse()));
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeDisabled();
    expect(screen.getByText("Loading product YoY analytics")).toBeVisible();
    expect(screen.queryByText("Scope: 2026 YTD Jan-Jun")).not.toBeInTheDocument();
    expect(screen.getByText("Loading product YoY scope")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await act(async () => newest.reject(new Error("Latest request failed")));
    expect(screen.getByRole("status")).toHaveTextContent("Latest request failed");
    expect(screen.queryByText("SKU-A")).not.toBeInTheDocument();
    expect(xlsxMock.writeFile).not.toHaveBeenCalled();
  });

  test("keeps disabled search and export visible on the initial deferred load", async () => {
    const pending = deferredResponse();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending.promise));
    render(<ProductYoYDashboard />);
    expect(screen.getByText("Loading product YoY scope")).toBeVisible();
    expect(screen.getByLabelText("Customer")).toBeVisible();
    expect(screen.getByLabelText("Search products")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeDisabled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await act(async () => pending.resolve(successfulResponse()));
    expect(screen.getByRole("table")).toBeVisible();
  });

  test.each([
    { kind: "month" as const, months: [6], label: "Month", range: "Jun" },
    { kind: "period" as const, months: [3, 4, 5, 6], label: "Period", range: "Mar-Jun" },
  ])("uses $label in scope, summary, and export filename", async ({ kind, months, label, range }) => {
    const data = createProductYoYResponse();
    data.analytics.months = months;
    Object.assign(data.analytics.period, {
      kind, months, startMonth: months[0], endMonth: months.at(-1),
      availableCurrentMonths: months, availablePriorMonths: months,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successfulResponse(data)));
    render(<ProductYoYDashboard />);
    await screen.findByText("SKU-A");
    expect(screen.getByText(`Scope: 2026 ${label} ${range}`)).toBeVisible();
    expect(screen.getByText(`2026 ${label} Qty`)).toBeVisible();
    expect(screen.getByText(`2025 ${label} Sales`)).toBeVisible();
    expect(screen.queryByText(/YTD/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(xlsxMock.writeFile).toHaveBeenCalledWith(expect.anything(), `Product_YoY_All_Customers_2026_${label}_${range}.xlsx`);
  });

  test.each(["current", "prior"] as const)("marks a wholly absent %s year unavailable, not zero or new/lost", async (year) => {
    const data = createProductYoYResponse();
    if (year === "current") {
      data.analytics.period.availableCurrentMonths = [];
      data.analytics.period.missingCurrentMonths = [1, 2, 3, 4, 5, 6];
      data.analytics.summary.currentQuantity = 0;
      data.analytics.summary.currentRevenue = 0;
      data.analytics.rows.forEach((row) => { row.currentQuantity = 0; });
    } else {
      data.analytics.period.availablePriorMonths = [];
      data.analytics.period.missingPriorMonths = [1, 2, 3, 4, 5, 6];
      data.analytics.summary.priorQuantity = 0;
      data.analytics.summary.priorRevenue = 0;
      data.analytics.rows.forEach((row) => { row.priorQuantity = 0; });
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successfulResponse(data)));
    render(<ProductYoYDashboard />);
    await screen.findByText("SKU-A");
    expect(screen.getByRole("status")).toHaveTextContent(/Incomplete coverage/);
    expect(screen.getByRole("status")).toHaveTextContent(year === "current" ? "2026" : "2025");
    expect(screen.getByRole("status")).toHaveTextContent(/Export disabled/);
    for (const metric of ["Qty", "Sales"]) {
      expect(screen.getByText(`${year === "current" ? 2026 : 2025} YTD ${metric}`).parentElement)
        .toHaveTextContent("Unavailable");
    }
    const cells = within(screen.getByText("SKU-A").closest("tr")!).getAllByRole("cell");
    expect(cells[year === "current" ? 3 : 4]).toHaveTextContent("Unavailable");
    expect(cells[5]).toHaveTextContent("Unavailable");
    expect(cells[6]).toHaveTextContent("Unavailable");
    expect(screen.queryByText(/1 new/)).not.toBeInTheDocument();
    expect(screen.queryByText("-6.3%")).not.toBeInTheDocument();
    expect(screen.queryByText("40.6%")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(xlsxMock.writeFile).not.toHaveBeenCalled();
  });

  test("shows partial totals but suppresses comparisons when a global month is missing", async () => {
    const data = createProductYoYResponse();
    data.analytics.period.availableCurrentMonths = [1, 2, 4, 5, 6];
    data.analytics.period.missingCurrentMonths = [3];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successfulResponse(data)));
    render(<ProductYoYDashboard />);
    await screen.findByText("SKU-A");
    expect(screen.getByRole("status")).toHaveTextContent(/2026.*Mar/);
    expect(screen.getByText("2026 YTD Qty").parentElement).toHaveTextContent("150");
    expect(screen.getByText("2026 YTD Qty").parentElement).toHaveTextContent(/Partial/);
    expect(screen.getByText("2025 YTD Qty").parentElement).toHaveTextContent("160");
    expect(screen.queryByText("25%")).not.toBeInTheDocument();
    expect(screen.queryByText("-100%")).not.toBeInTheDocument();
    expect(screen.queryByText(/1 new/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeDisabled();
  });

  test("treats an empty reporting window as unavailable even with no missing-month entries", async () => {
    const data = createProductYoYResponse();
    Object.assign(data.analytics.period, {
      endMonth: 0, months: [], availableCurrentMonths: [], availablePriorMonths: [],
    });
    data.analytics.months = [];
    data.analytics.rows = [];
    data.analytics.summary.lineItemCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successfulResponse(data)));
    render(<ProductYoYDashboard />);
    expect(await screen.findByRole("status")).toHaveTextContent(/Incomplete coverage/);
    expect(screen.getByText("2026 YTD Qty").parentElement).toHaveTextContent("Unavailable");
    expect(screen.getByText("2025 YTD Qty").parentElement).toHaveTextContent("Unavailable");
    expect(screen.queryByText("-6.3%")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeDisabled();
  });

  test("keeps all 606 item rows and numeric summaries when both years have every month", async () => {
    const data = createProductYoYResponse();
    data.analytics.rows = Array.from({ length: 606 }, (_, index) => ({
      ...data.analytics.rows[0], sku: `SKU-${index + 1}`,
    }));
    Object.assign(data.analytics.summary, {
      lineItemCount: 606, currentQuantity: 60600, priorQuantity: 48480,
      quantityDiff: 12120, quantityGrowth: 0.25,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successfulResponse(data)));
    render(<ProductYoYDashboard />);
    await screen.findByText("SKU-606");
    expect(screen.getAllByTestId("product-yoy-sku")).toHaveLength(606);
    expect(screen.getByText("Item Detail · 606 line items")).toBeVisible();
    expect(screen.getByText("2026 YTD Qty").parentElement).toHaveTextContent("60,600");
    expect(screen.getByText("2025 YTD Qty").parentElement).toHaveTextContent("48,480");
    expect(screen.getByText("Qty YoY").parentElement).toHaveTextContent("25%");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export Excel" })).toBeEnabled();
  });

  test("loads product YoY rows and defaults to current-year quantity ranking", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => createProductYoYResponse(),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductYoYDashboard />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analytics/product-yoy",
        expect.objectContaining({ cache: "no-store" }),
      ),
    );

    expect(await screen.findByText("Product YoY Performance")).toBeVisible();
    expect(screen.getByText("Overall Summary")).toBeVisible();
    expect(screen.getByText("Line Items")).toBeVisible();
    expect(screen.getByText("Item Detail · 3 line items")).toBeVisible();
    expect(screen.getByText("2026 YTD Qty")).toBeVisible();
    expect(screen.getByText("150")).toBeVisible();
    expect(screen.getByText("2025 YTD Qty")).toBeVisible();
    expect(screen.getByText("160")).toBeVisible();
    expect(screen.getByText("Qty YoY")).toBeVisible();
    expect(screen.getByText("-6.3%")).toBeVisible();
    expect(screen.getByText("Sales YoY")).toBeVisible();
    expect(screen.getByText("40.6%")).toBeVisible();
    expect(screen.getByText("Line Item")).toBeVisible();
    expect(screen.getByText("SKU / Item")).toBeVisible();
    expect(screen.getByText("Description")).toBeVisible();
    expect(screen.getByText("2026 Qty")).toBeVisible();
    expect(screen.getByText("2025 Qty")).toBeVisible();
    expect(screen.getAllByText("Qty Diff").length).toBeGreaterThan(0);
    expect(screen.getByText("Qty YoY %")).toBeVisible();
    expect(screen.getByText("Scope: 2026 YTD Jan-Jun")).toBeVisible();
    expect(screen.getByLabelText("Customer")).toBeVisible();

    expect(screen.getAllByTestId("product-yoy-line-item")[0]).toHaveTextContent("1");
    const firstSku = screen.getAllByTestId("product-yoy-sku")[0];
    expect(firstSku).toHaveTextContent("SKU-A");
    expect(screen.getByText("25%")).toBeVisible();
    expect(screen.getByText("N/A")).toBeVisible();
    expect(screen.getByText("-100%")).toHaveClass("text-red-600");
    expect(screen.getByText("Item Detail · 3 line items").parentElement).toContainElement(
      screen.getByLabelText("Search products"),
    );
  });

  test("filters products by SKU or description", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createProductYoYResponse(),
      }),
    );

    render(<ProductYoYDashboard />);

    await screen.findByText("SKU-A");
    fireEvent.change(screen.getByLabelText("Search products"), {
      target: { value: "bravo" },
    });

    expect(screen.getByText("SKU-B")).toBeVisible();
    expect(screen.queryByText("SKU-A")).not.toBeInTheDocument();
    expect(screen.queryByText("SKU-C")).not.toBeInTheDocument();
  });

  test("exports the visible item detail rows to Excel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createProductYoYResponse(),
      }),
    );

    render(<ProductYoYDashboard />);

    await screen.findByText("SKU-A");
    fireEvent.change(screen.getByLabelText("Search products"), {
      target: { value: "bravo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));

    expect(xlsxMock.jsonToSheet).toHaveBeenCalledWith([
      {
        "Line Item": 1,
        "SKU / Item": "SKU-B",
        Description: "Bravo tire",
        "2026 Qty": 50,
        "2025 Qty": 0,
        "Qty Diff": 50,
        "Qty YoY %": "N/A",
      },
    ]);
    expect(xlsxMock.bookAppendSheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Product YoY",
    );
    expect(xlsxMock.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      "Product_YoY_All_Customers_2026_YTD_Jan-Jun.xlsx",
    );
  });

  test("reloads item YoY for the selected customer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createProductYoYResponse(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          analytics: {
            currentYear: 2026,
            priorYear: 2025,
            months: [1, 2, 3, 4, 5, 6],
            period: createProductYoYResponse().analytics.period,
            summary: {
              currentQuantity: 25,
              priorQuantity: 10,
              quantityDiff: 15,
              quantityGrowth: 1.5,
              currentRevenue: 250,
              priorRevenue: 100,
              revenueDiff: 150,
              revenueGrowth: 1.5,
              lineItemCount: 1,
              newItemCount: 0,
              lostItemCount: 0,
            },
            filterOptions: {
              customers: ["Customer A", "Customer B"],
            },
            rows: [
              {
                sku: "SKU-A",
                description: "Alpha tire",
                currentQuantity: 25,
                priorQuantity: 10,
                quantityDiff: 15,
                quantityGrowth: 1.5,
              },
            ],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProductYoYDashboard />);

    await screen.findByText("SKU-A");
    fireEvent.change(screen.getByLabelText("Customer"), {
      target: { value: "Customer B" },
    });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analytics/product-yoy?customerName=Customer+B",
        expect.objectContaining({ cache: "no-store" }),
      ),
    );

    expect(await screen.findByText("Scope: 2026 YTD Jan-Jun · Customer: Customer B")).toBeVisible();
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
  });
});
