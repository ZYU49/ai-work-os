// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { WarehouseOverdueMonitor } from "@/components/analytics/warehouse-overdue-monitor";

const reportText = `
Please find the warehouse orders overdue report as of 2026-07-21 below:

SO#	 SHR Created?	 SO Date	 Requested Delivery Date	 Delayed Days	 Customer	 Total Ordered Qty	 Total Open Qty	 Sales Person	 Warehouse	 Late Ship Reason
653687	 NO	 07/02/2026	 07/09/2026	 12	 WAL-MART.COM	 2	 2	 Bella Cui	 Anderson
650955	 YES	 07/09/2026	 07/17/2026	 4	 TRACTOR SUPPLY COMPANY	 1727	 1727	 Allen Meng	 Anderson
650956	 YES	 07/09/2026	 07/17/2026	 4	 TRACTOR SUPPLY COMPANY	 1344	 1344	 Allen Meng	 Anderson
651055	 YES	 07/10/2026	 07/17/2026	 4	 WHEATBELT, INC.	 58	 58	 Bella Cui	 Anderson
651680	 YES	 07/13/2026	 07/20/2026	 1	 WHEATBELT, INC.	 50	 50	 Bella Cui	 Anderson
649960	 YES	 07/05/2026	 07/19/2026	 2	 RKDS, LLC	 1122	 1122	 Allen Meng	 Anderson
`;

describe("WarehouseOverdueMonitor", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("analyzes pasted Allen and Bella overdue report text", () => {
    render(<WarehouseOverdueMonitor />);

    fireEvent.change(screen.getByLabelText("Paste OA overdue report"), {
      target: { value: reportText },
    });

    expect(screen.getByText("4,303")).toBeVisible();
    expect(screen.getAllByText("6").length).toBeGreaterThan(0);
    expect(screen.getByText("Allen Meng")).toBeVisible();
    expect(screen.getByText("Bella Cui")).toBeVisible();
    expect(screen.getByText("TRACTOR SUPPLY COMPANY")).toBeVisible();
    expect(screen.getAllByText("WAL-MART.COM").length).toBeGreaterThan(0);
    expect(screen.queryByText("Missing Reason")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Needs attention")).toHaveTextContent("653687");
  });

  test("loads an overdue report from an uploaded text file", async () => {
    render(<WarehouseOverdueMonitor />);

    const file = new File([reportText], "warehouse-overdue.txt", {
      type: "text/plain",
    });
    fireEvent.change(screen.getByLabelText("Upload report file"), {
      target: { files: [file] },
    });

    expect(await screen.findByText("4,303")).toBeVisible();
    expect(screen.getByLabelText("Paste OA overdue report")).toHaveValue(reportText);
    expect(screen.getByLabelText("Needs attention")).toHaveTextContent("653687");
  });

  test("copies the generated follow-up summary", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });
    render(<WarehouseOverdueMonitor />);

    fireEvent.change(screen.getByLabelText("Paste OA overdue report"), {
      target: { value: reportText },
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy Follow-up Summary" }));

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Allen Meng: 3 overdue orders"),
    );
    expect(await screen.findByText("Copied")).toBeVisible();
  });
});
