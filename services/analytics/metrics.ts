import type { SalesRecord } from "@prisma/client";
import { z } from "zod";

export const salesAnalyticsFiltersSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  salesperson: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  shipToState: z.string().trim().optional(),
  memberName: z.string().trim().optional(),
});

export type SalesAnalyticsFilters = z.infer<typeof salesAnalyticsFiltersSchema>;

type SalesMetricRow = Pick<
  SalesRecord,
  | "orderDate"
  | "customerName"
  | "sku"
  | "category"
  | "salesperson"
  | "shipToState"
  | "memberName"
> & {
  quantity: number;
  revenue: number;
};

type SalesAnalyticsRanking = {
  name: string;
  quantity: number;
  revenue: number;
};

type SalesAnalyticsMonthly = {
  month: string;
  quantity: number;
  revenue: number;
  momQuantityGrowth: number | null;
  momRevenueGrowth: number | null;
  yoyQuantityGrowth: number | null;
  yoyRevenueGrowth: number | null;
};

export type SalesAnalyticsOverview = {
  kpis: {
    ytdQuantity: number;
    ytdRevenue: number;
    averageUnitPrice: number | null;
    activeCustomers: number;
  };
  monthly: SalesAnalyticsMonthly[];
  topCustomers: SalesAnalyticsRanking[];
  topCategories: SalesAnalyticsRanking[];
  topSkus: SalesAnalyticsRanking[];
  salespeople: SalesAnalyticsRanking[];
  states: SalesAnalyticsRanking[];
  filterOptions: {
    years: string[];
    salespeople: string[];
    customers: string[];
    categories: string[];
    skus: string[];
    states: string[];
    members: string[];
  };
};

type SalesMetricRowSelection = {
  orderDate: true;
  customerName: true;
  sku: true;
  category: true;
  salesperson: true;
  shipToState: true;
  memberName: true;
  quantity: true;
  revenue: true;
};

export function calculateGrowth(
  current: number,
  previous: number | null | undefined,
): number | null {
  if (!previous) {
    return null;
  }

  return (current - previous) / previous;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const date = new Date(Date.UTC(year, monthIndex, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addToRanking(
  map: Map<string, { quantity: number; revenue: number }>,
  key: string | null | undefined,
  quantity: number,
  revenue: number,
) {
  if (!key) {
    return;
  }

  const current = map.get(key) ?? { quantity: 0, revenue: 0 };
  current.quantity += quantity;
  current.revenue += revenue;
  map.set(key, current);
}

function ranking(map: Map<string, { quantity: number; revenue: number }>) {
  return [...map.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20);
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b));
}

export function summarizeSalesRowsForTest(
  rows: SalesMetricRow[],
  filters: SalesAnalyticsFilters,
  filterOptionRows: SalesMetricRow[] = rows,
): SalesAnalyticsOverview {
  const year = filters.year ?? new Date().getFullYear();
  const currentRows = rows.filter((row) => row.orderDate.getFullYear() === year);
  const priorRows = rows.filter((row) => row.orderDate.getFullYear() === year - 1);
  const monthlyMap = new Map<string, { quantity: number; revenue: number }>();
  const priorMonthlyMap = new Map<string, { quantity: number; revenue: number }>();
  const customers = new Map<string, { quantity: number; revenue: number }>();
  const categories = new Map<string, { quantity: number; revenue: number }>();
  const skus = new Map<string, { quantity: number; revenue: number }>();
  const salespeople = new Map<string, { quantity: number; revenue: number }>();
  const states = new Map<string, { quantity: number; revenue: number }>();

  for (const row of currentRows) {
    const key = monthKey(row.orderDate);
    const month = monthlyMap.get(key) ?? { quantity: 0, revenue: 0 };
    month.quantity += row.quantity;
    month.revenue += row.revenue;
    monthlyMap.set(key, month);

    addToRanking(customers, row.customerName, row.quantity, row.revenue);
    addToRanking(categories, row.category, row.quantity, row.revenue);
    addToRanking(skus, row.sku, row.quantity, row.revenue);
    addToRanking(salespeople, row.salesperson, row.quantity, row.revenue);
    addToRanking(states, row.shipToState, row.quantity, row.revenue);
  }

  for (const row of priorRows) {
    const key = `${year}-${String(row.orderDate.getMonth() + 1).padStart(2, "0")}`;
    const month = priorMonthlyMap.get(key) ?? { quantity: 0, revenue: 0 };
    month.quantity += row.quantity;
    month.revenue += row.revenue;
    priorMonthlyMap.set(key, month);
  }

  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => {
      const previous = monthlyMap.get(previousMonthKey(month));
      const prior = priorMonthlyMap.get(month);

      return {
        month,
        quantity: value.quantity,
        revenue: value.revenue,
        momQuantityGrowth: calculateGrowth(value.quantity, previous?.quantity),
        momRevenueGrowth: calculateGrowth(value.revenue, previous?.revenue),
        yoyQuantityGrowth: calculateGrowth(value.quantity, prior?.quantity),
        yoyRevenueGrowth: calculateGrowth(value.revenue, prior?.revenue),
      };
    });

  const ytdQuantity = currentRows.reduce((sum, row) => sum + row.quantity, 0);
  const ytdRevenue = currentRows.reduce((sum, row) => sum + row.revenue, 0);

  return {
    kpis: {
      ytdQuantity,
      ytdRevenue,
      averageUnitPrice: ytdQuantity ? ytdRevenue / ytdQuantity : null,
      activeCustomers: new Set(currentRows.map((row) => row.customerName)).size,
    },
    monthly,
    topCustomers: ranking(customers),
    topCategories: ranking(categories),
    topSkus: ranking(skus),
    salespeople: ranking(salespeople),
    states: ranking(states),
    filterOptions: {
      years: unique(
        filterOptionRows.map((row) => String(row.orderDate.getFullYear())),
      ),
      salespeople: unique(filterOptionRows.map((row) => row.salesperson)),
      customers: unique(filterOptionRows.map((row) => row.customerName)),
      categories: unique(filterOptionRows.map((row) => row.category)),
      skus: unique(filterOptionRows.map((row) => row.sku)),
      states: unique(filterOptionRows.map((row) => row.shipToState)),
      members: unique(filterOptionRows.map((row) => row.memberName)),
    },
  };
}

function normalizeSalesMetricRows(
  rows: Array<
    Pick<
      SalesRecord,
      | "orderDate"
      | "customerName"
      | "sku"
      | "category"
      | "salesperson"
      | "shipToState"
      | "memberName"
      | "quantity"
      | "revenue"
    >
  >,
): SalesMetricRow[] {
  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    revenue: Number(row.revenue),
  }));
}

export async function getSalesAnalytics(
  filters: SalesAnalyticsFilters,
): Promise<SalesAnalyticsOverview> {
  const year = filters.year ?? new Date().getFullYear();
  const { prisma } = await import("@/lib/db");
  const dateWhere = {
    gte: new Date(`${year - 1}-01-01T00:00:00`),
    lt: new Date(`${year + 1}-01-01T00:00:00`),
  };
  const select: SalesMetricRowSelection = {
    orderDate: true,
    customerName: true,
    sku: true,
    category: true,
    salesperson: true,
    shipToState: true,
    memberName: true,
    quantity: true,
    revenue: true,
  };
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
        orderDate: dateWhere,
      },
      select,
    }),
  ]);

  return summarizeSalesRowsForTest(
    normalizeSalesMetricRows(rows),
    { ...filters, year },
    normalizeSalesMetricRows(filterOptionRows),
  );
}
