import { describe, expect, test } from "vitest";
import { analyzeWarehouseOverdueReport } from "@/services/warehouse-overdue/monitor";

const reportText = `
Please find the warehouse orders overdue report as of 2026-07-21 below:

SO#	 SHR Created?	 SO Date	 Requested Delivery Date	 Delayed Days	 Customer	 Total Ordered Qty	 Total Open Qty	 Sales Person	 Warehouse	 Late Ship Reason
645663	 YES	 06/19/2026	 07/03/2026	 18	 S & S TIRE	 928	 533	 Nancy Zhao	 Anderson
653687	 NO	 07/02/2026	 07/09/2026	 12	 WAL-MART.COM	 2	 2	 Bella Cui	 Anderson
650955	 YES	 07/09/2026	 07/17/2026	 4	 TRACTOR SUPPLY COMPANY	 1727	 1727	 Allen Meng	 Anderson
650956	 YES	 07/09/2026	 07/17/2026	 4	 TRACTOR SUPPLY COMPANY	 1344	 1344	 Allen Meng	 Anderson
651055	 YES	 07/10/2026	 07/17/2026	 4	 WHEATBELT, INC.	 58	 58	 Bella Cui	 Anderson
651680	 YES	 07/13/2026	 07/20/2026	 1	 WHEATBELT, INC.	 50	 50	 Bella Cui	 Anderson
649960	 YES	 07/05/2026	 07/19/2026	 2	 RKDS, LLC	 1122	 1122	 Allen Meng	 Anderson
`;

describe("warehouse overdue monitor", () => {
  test("filters the overdue report to Allen and Bella and summarizes action items", () => {
    const analysis = analyzeWarehouseOverdueReport(reportText);

    expect(analysis.reportDate).toBe("2026-07-21");
    expect(analysis.warehouse).toBe("Anderson");
    expect(analysis.summary).toEqual({
      orderCount: 6,
      totalOpenQty: 4303,
      urgentOrderCount: 1,
      missingReasonCount: 6,
      noShrCount: 1,
    });
    expect(analysis.bySalesPerson).toMatchObject([
      {
        salesPerson: "Allen Meng",
        orderCount: 3,
        totalOpenQty: 4193,
        maxDelayedDays: 4,
      },
      {
        salesPerson: "Bella Cui",
        orderCount: 3,
        totalOpenQty: 110,
        maxDelayedDays: 12,
      },
    ]);
    expect(analysis.bySalesPerson[0]?.topCustomers).toEqual([
      {
        customer: "TRACTOR SUPPLY COMPANY",
        orderCount: 2,
        totalOpenQty: 3071,
        maxDelayedDays: 4,
      },
      {
        customer: "RKDS, LLC",
        orderCount: 1,
        totalOpenQty: 1122,
        maxDelayedDays: 2,
      },
    ]);
    expect(analysis.urgentOrders).toEqual([
      expect.objectContaining({
        so: "653687",
        customer: "WAL-MART.COM",
        salesPerson: "Bella Cui",
        totalOpenQty: 2,
        delayedDays: 12,
        shrCreated: false,
      }),
    ]);
    expect(analysis.followUpSummary).toContain("Allen Meng: 3 overdue orders");
    expect(analysis.followUpSummary).toContain("Bella Cui: 3 overdue orders");
    expect(analysis.followUpSummary).toContain("WAL-MART.COM SO 653687");
    expect(analysis.rows.some((row) => row.customer === "S & S TIRE")).toBe(false);
  });
});
