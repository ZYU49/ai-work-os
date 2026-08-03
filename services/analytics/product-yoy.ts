import type { SalesRecord } from "@prisma/client";
import {
  type SalesAnalyticsFilters,
  salesAnalyticsFiltersSchema,
} from "@/services/analytics/metrics";

type ProductYoYSourceRow = Pick<
  SalesRecord,
  "orderDate" | "customerName" | "sku" | "productName"
> & {
  quantity: number;
  revenue: number;
};

export type ProductYoYRow = {
  sku: string;
  description: string;
  currentQuantity: number;
  priorQuantity: number;
  quantityDiff: number;
  quantityGrowth: number | null;
};

type ProductYoYSummary = {
  currentQuantity: number;
  priorQuantity: number;
  quantityDiff: number;
  quantityGrowth: number | null;
  currentRevenue: number;
  priorRevenue: number;
  revenueDiff: number;
  revenueGrowth: number | null;
  lineItemCount: number;
  newItemCount: number;
  lostItemCount: number;
};

export type ProductYoYOverview = {
  currentYear: number;
  priorYear: number;
  months: number[];
  summary: ProductYoYSummary;
  rows: ProductYoYRow[];
  filterOptions: {
    customers: string[];
  };
};

function normalizeDescription(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function calculateGrowth(current: number, prior: number) {
  if (!prior) {
    return null;
  }

  return (current - prior) / prior;
}

function addQuantity(map: Map<string, number>, sku: string, quantity: number) {
  map.set(sku, (map.get(sku) ?? 0) + quantity);
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b));
}

export function summarizeProductYoYRowsForTest(
  rows: ProductYoYSourceRow[],
  filters: SalesAnalyticsFilters,
  filterOptionRows: ProductYoYSourceRow[] = rows,
): ProductYoYOverview {
  const parsedFilters = salesAnalyticsFiltersSchema.parse(filters);
  const currentYear = parsedFilters.year ?? new Date().getFullYear();
  const priorYear = currentYear - 1;
  const optionRows = filterOptionRows.filter(
    (row) =>
      row.orderDate.getFullYear() === currentYear ||
      row.orderDate.getFullYear() === priorYear,
  );
  const scopedRows = rows
    .filter(
      (row) =>
        row.orderDate.getFullYear() === currentYear ||
        row.orderDate.getFullYear() === priorYear,
    )
    .filter(
    (row) =>
      !parsedFilters.customerName ||
      row.customerName === parsedFilters.customerName,
    );
  const currentRows = scopedRows.filter(
    (row) => row.orderDate.getFullYear() === currentYear,
  );
  const currentMonths = new Set(
    currentRows.map((row) => row.orderDate.getMonth() + 1),
  );
  const explicitStartMonth = parsedFilters.startMonth;
  const explicitEndMonth = parsedFilters.endMonth;
  const months =
    explicitStartMonth && explicitEndMonth
      ? Array.from(
          { length: explicitEndMonth - explicitStartMonth + 1 },
          (_, index) => explicitStartMonth + index,
        )
      : [...currentMonths].sort((a, b) => a - b);
  const allowedMonths = new Set(months);
  const currentQuantityBySku = new Map<string, number>();
  const priorQuantityBySku = new Map<string, number>();
  const currentRevenueBySku = new Map<string, number>();
  const priorRevenueBySku = new Map<string, number>();
  const descriptions = new Map<string, string>();

  for (const row of scopedRows) {
    const rowYear = row.orderDate.getFullYear();
    const rowMonth = row.orderDate.getMonth() + 1;

    if (!allowedMonths.has(rowMonth)) {
      continue;
    }

    if (rowYear !== currentYear && rowYear !== priorYear) {
      continue;
    }

    const description = normalizeDescription(row.productName);
    if (description && (rowYear === currentYear || !descriptions.has(row.sku))) {
      descriptions.set(row.sku, description);
    }

    if (rowYear === currentYear) {
      addQuantity(currentQuantityBySku, row.sku, row.quantity);
      addQuantity(currentRevenueBySku, row.sku, row.revenue);
    } else {
      addQuantity(priorQuantityBySku, row.sku, row.quantity);
      addQuantity(priorRevenueBySku, row.sku, row.revenue);
    }
  }

  const skus = new Set([
    ...currentQuantityBySku.keys(),
    ...priorQuantityBySku.keys(),
  ]);

  const outputRows = [...skus]
    .map((sku) => {
      const currentQuantity = currentQuantityBySku.get(sku) ?? 0;
      const priorQuantity = priorQuantityBySku.get(sku) ?? 0;

      return {
        sku,
        description: descriptions.get(sku) ?? "",
        currentQuantity,
        priorQuantity,
        quantityDiff: currentQuantity - priorQuantity,
        quantityGrowth: calculateGrowth(currentQuantity, priorQuantity),
      };
    })
    .sort(
      (a, b) =>
        b.currentQuantity - a.currentQuantity || a.sku.localeCompare(b.sku),
    );
  const currentQuantity = outputRows.reduce(
    (sum, row) => sum + row.currentQuantity,
    0,
  );
  const priorQuantity = outputRows.reduce((sum, row) => sum + row.priorQuantity, 0);
  const currentRevenue = [...currentRevenueBySku.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const priorRevenue = [...priorRevenueBySku.values()].reduce(
    (sum, value) => sum + value,
    0,
  );

  return {
    currentYear,
    priorYear,
    months,
    summary: {
      currentQuantity,
      priorQuantity,
      quantityDiff: currentQuantity - priorQuantity,
      quantityGrowth: calculateGrowth(currentQuantity, priorQuantity),
      currentRevenue,
      priorRevenue,
      revenueDiff: currentRevenue - priorRevenue,
      revenueGrowth: calculateGrowth(currentRevenue, priorRevenue),
      lineItemCount: outputRows.length,
      newItemCount: outputRows.filter(
        (row) => row.currentQuantity > 0 && row.priorQuantity === 0,
      ).length,
      lostItemCount: outputRows.filter(
        (row) => row.currentQuantity === 0 && row.priorQuantity > 0,
      ).length,
    },
    filterOptions: {
      customers: unique(optionRows.map((row) => row.customerName)),
    },
    rows: outputRows,
  };
}

function normalizeProductRows(
  rows: Array<
    Pick<
      SalesRecord,
      "orderDate" | "customerName" | "sku" | "productName" | "quantity"
      | "revenue"
    >
  >,
): ProductYoYSourceRow[] {
  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    revenue: Number(row.revenue),
  }));
}

export async function getProductYoYAnalytics(
  filters: SalesAnalyticsFilters,
): Promise<ProductYoYOverview> {
  const year = filters.year ?? new Date().getFullYear();
  const { prisma } = await import("@/lib/db");
  const dateWhere = {
    gte: new Date(year - 1, 0, 1),
    lt: new Date(year + 1, 0, 1),
  };
  const select = {
    orderDate: true,
    customerName: true,
    sku: true,
    productName: true,
    quantity: true,
    revenue: true,
  } as const;
  const [rows, filterOptionRows] = await Promise.all([
    prisma.salesRecord.findMany({
      where: {
        orderDate: dateWhere,
        ...(filters.salesperson ? { salesperson: filters.salesperson } : {}),
        ...(filters.customerName ? { customerName: filters.customerName } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.sku ? { sku: filters.sku } : {}),
        ...(filters.shipToState ? { shipToState: filters.shipToState } : {}),
        ...(filters.memberName ? { memberName: filters.memberName } : {}),
      },
      select,
    }),
    prisma.salesRecord.findMany({
      where: {
      orderDate: {
          gte: new Date(year - 1, 0, 1),
          lt: new Date(year + 1, 0, 1),
      },
      ...(filters.salesperson ? { salesperson: filters.salesperson } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.sku ? { sku: filters.sku } : {}),
      ...(filters.shipToState ? { shipToState: filters.shipToState } : {}),
      ...(filters.memberName ? { memberName: filters.memberName } : {}),
    },
      select,
    }),
  ]);

  return summarizeProductYoYRowsForTest(
    normalizeProductRows(rows),
    {
      ...filters,
      year,
    },
    normalizeProductRows(filterOptionRows),
  );
}
