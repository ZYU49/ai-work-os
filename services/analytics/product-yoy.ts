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
};

export type ProductYoYRow = {
  sku: string;
  description: string;
  currentQuantity: number;
  priorQuantity: number;
  quantityDiff: number;
  quantityGrowth: number | null;
};

export type ProductYoYOverview = {
  currentYear: number;
  priorYear: number;
  months: number[];
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
): ProductYoYOverview {
  const parsedFilters = salesAnalyticsFiltersSchema.parse(filters);
  const currentYear = parsedFilters.year ?? new Date().getFullYear();
  const priorYear = currentYear - 1;
  const optionRows = rows.filter(
    (row) =>
      row.orderDate.getFullYear() === currentYear ||
      row.orderDate.getFullYear() === priorYear,
  );
  const scopedRows = optionRows.filter(
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
    } else {
      addQuantity(priorQuantityBySku, row.sku, row.quantity);
    }
  }

  const skus = new Set([
    ...currentQuantityBySku.keys(),
    ...priorQuantityBySku.keys(),
  ]);

  return {
    currentYear,
    priorYear,
    months,
    filterOptions: {
      customers: unique(optionRows.map((row) => row.customerName)),
    },
    rows: [...skus]
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
      ),
  };
}

function normalizeProductRows(
  rows: Array<
    Pick<
      SalesRecord,
      "orderDate" | "customerName" | "sku" | "productName" | "quantity"
    >
  >,
): ProductYoYSourceRow[] {
  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
  }));
}

export async function getProductYoYAnalytics(
  filters: SalesAnalyticsFilters,
): Promise<ProductYoYOverview> {
  const year = filters.year ?? new Date().getFullYear();
  const { prisma } = await import("@/lib/db");
  const rows = await prisma.salesRecord.findMany({
    where: {
      orderDate: {
        gte: new Date(year - 1, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
      ...(filters.salesperson ? { salesperson: filters.salesperson } : {}),
      ...(filters.customerName ? { customerName: filters.customerName } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.sku ? { sku: filters.sku } : {}),
      ...(filters.shipToState ? { shipToState: filters.shipToState } : {}),
      ...(filters.memberName ? { memberName: filters.memberName } : {}),
    },
    select: {
      orderDate: true,
      customerName: true,
      sku: true,
      productName: true,
      quantity: true,
    },
  });

  return summarizeProductYoYRowsForTest(normalizeProductRows(rows), {
    ...filters,
    year,
  });
}
