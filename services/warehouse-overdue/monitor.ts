const trackedSalesPeople = new Set(["Allen Meng", "Bella Cui"]);

export type WarehouseOverdueRow = {
  so: string;
  shrCreated: boolean;
  soDate: string;
  requestedDeliveryDate: string;
  delayedDays: number;
  customer: string;
  totalOrderedQty: number;
  totalOpenQty: number;
  salesPerson: string;
  warehouse: string;
  lateShipReason: string | null;
};

export type WarehouseOverdueCustomerSummary = {
  customer: string;
  orderCount: number;
  totalOpenQty: number;
  maxDelayedDays: number;
};

export type WarehouseOverdueSalesPersonSummary = {
  salesPerson: string;
  orderCount: number;
  totalOpenQty: number;
  maxDelayedDays: number;
  topCustomers: WarehouseOverdueCustomerSummary[];
};

export type WarehouseOverdueAnalysis = {
  reportDate: string | null;
  warehouse: string | null;
  rows: WarehouseOverdueRow[];
  summary: {
    orderCount: number;
    totalOpenQty: number;
    urgentOrderCount: number;
    missingReasonCount: number;
    noShrCount: number;
  };
  bySalesPerson: WarehouseOverdueSalesPersonSummary[];
  urgentOrders: WarehouseOverdueRow[];
  followUpSummary: string;
};

function numberValue(value: string) {
  const parsed = Number(value.trim().replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: string | undefined) {
  const text = value?.trim();
  return text ? text : null;
}

function reportDateFromText(text: string) {
  return text.match(/as of\s+(\d{4}-\d{2}-\d{2})/i)?.[1] ?? null;
}

function parseReportRow(line: string): WarehouseOverdueRow | null {
  if (!/^\d{6}\s/.test(line)) {
    return null;
  }

  const columns = line.split("\t").map((column) => column.trim());
  if (columns.length < 10) {
    return null;
  }

  return {
    so: columns[0] ?? "",
    shrCreated: (columns[1] ?? "").toUpperCase() === "YES",
    soDate: columns[2] ?? "",
    requestedDeliveryDate: columns[3] ?? "",
    delayedDays: numberValue(columns[4] ?? ""),
    customer: columns[5] ?? "",
    totalOrderedQty: numberValue(columns[6] ?? ""),
    totalOpenQty: numberValue(columns[7] ?? ""),
    salesPerson: columns[8] ?? "",
    warehouse: columns[9] ?? "",
    lateShipReason: textValue(columns[10]),
  };
}

function customerSummaries(rows: WarehouseOverdueRow[]) {
  const customers = new Map<string, WarehouseOverdueCustomerSummary>();

  for (const row of rows) {
    const current = customers.get(row.customer) ?? {
      customer: row.customer,
      orderCount: 0,
      totalOpenQty: 0,
      maxDelayedDays: 0,
    };
    current.orderCount += 1;
    current.totalOpenQty += row.totalOpenQty;
    current.maxDelayedDays = Math.max(current.maxDelayedDays, row.delayedDays);
    customers.set(row.customer, current);
  }

  return [...customers.values()].sort(
    (a, b) =>
      b.totalOpenQty - a.totalOpenQty ||
      b.maxDelayedDays - a.maxDelayedDays ||
      a.customer.localeCompare(b.customer),
  );
}

function salesPersonSummaries(rows: WarehouseOverdueRow[]) {
  return ["Allen Meng", "Bella Cui"]
    .map((salesPerson) => {
      const personRows = rows.filter((row) => row.salesPerson === salesPerson);
      return {
        salesPerson,
        orderCount: personRows.length,
        totalOpenQty: personRows.reduce((sum, row) => sum + row.totalOpenQty, 0),
        maxDelayedDays: personRows.reduce(
          (max, row) => Math.max(max, row.delayedDays),
          0,
        ),
        topCustomers: customerSummaries(personRows),
      };
    })
    .sort((a, b) => b.totalOpenQty - a.totalOpenQty);
}

function isUrgent(row: WarehouseOverdueRow) {
  return row.delayedDays >= 7 || !row.shrCreated;
}

function buildFollowUpSummary(analysis: Omit<WarehouseOverdueAnalysis, "followUpSummary">) {
  const lines = [
    `Warehouse overdue update${analysis.reportDate ? ` as of ${analysis.reportDate}` : ""}: ${analysis.summary.orderCount} Allen/Bella orders, total open qty ${analysis.summary.totalOpenQty.toLocaleString()}.`,
    ...analysis.bySalesPerson.map(
      (person) =>
        `${person.salesPerson}: ${person.orderCount} overdue orders, open qty ${person.totalOpenQty.toLocaleString()}, max delay ${person.maxDelayedDays} days.`,
    ),
  ];

  if (analysis.urgentOrders.length > 0) {
    lines.push(
      `Priority: ${analysis.urgentOrders
        .slice(0, 5)
        .map(
          (row) =>
            `${row.customer} SO ${row.so} (${row.delayedDays} days late, SHR ${row.shrCreated ? "YES" : "NO"})`,
        )
        .join("; ")}.`,
    );
  }

  if (analysis.summary.missingReasonCount > 0) {
    lines.push(
      `Please ask the warehouse for updated ship dates and late ship reasons for the blank reason lines.`,
    );
  }

  return lines.join("\n");
}

export function analyzeWarehouseOverdueReport(
  text: string,
): WarehouseOverdueAnalysis {
  const rows = text
    .split(/\r?\n/)
    .map(parseReportRow)
    .filter((row): row is WarehouseOverdueRow => row !== null)
    .filter((row) => trackedSalesPeople.has(row.salesPerson));
  const urgentOrders = rows
    .filter(isUrgent)
    .sort(
      (a, b) =>
        b.delayedDays - a.delayedDays ||
        b.totalOpenQty - a.totalOpenQty ||
        a.so.localeCompare(b.so),
    );
  const analysisWithoutSummary: Omit<
    WarehouseOverdueAnalysis,
    "followUpSummary"
  > = {
    reportDate: reportDateFromText(text),
    warehouse: rows[0]?.warehouse ?? null,
    rows,
    summary: {
      orderCount: rows.length,
      totalOpenQty: rows.reduce((sum, row) => sum + row.totalOpenQty, 0),
      urgentOrderCount: urgentOrders.length,
      missingReasonCount: rows.filter((row) => !row.lateShipReason).length,
      noShrCount: rows.filter((row) => !row.shrCreated).length,
    },
    bySalesPerson: salesPersonSummaries(rows),
    urgentOrders,
  };

  return {
    ...analysisWithoutSummary,
    followUpSummary: buildFollowUpSummary(analysisWithoutSummary),
  };
}
