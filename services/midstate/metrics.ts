import type { MidstateSellThroughRecord } from "@prisma/client";
import { z } from "zod";

export const midstateAnalyticsFiltersSchema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    startMonth: z.coerce.number().int().min(1).max(12).optional(),
    endMonth: z.coerce.number().int().min(1).max(12).optional(),
    memberNumber: z.string().trim().optional(),
    sku: z.string().trim().optional(),
    category: z.string().trim().optional(),
    orderClass: z.string().trim().optional(),
  })
  .superRefine((filters, context) => {
    const startMonth = filters.startMonth ?? 1;
    const endMonth = filters.endMonth ?? 12;
    if (startMonth > endMonth) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startMonth"],
        message: "Start month must be before or equal to end month.",
      });
    }
  });

export type MidstateAnalyticsFilters = z.infer<
  typeof midstateAnalyticsFiltersSchema
>;

type MidstateMetricRow = Pick<
  MidstateSellThroughRecord,
  | "postDate"
  | "memberNumber"
  | "memberName"
  | "sku"
  | "description"
  | "orderClass"
  | "category"
> & {
  quantity: number;
  costExt: number | null;
};

export type MidstateAnalyticsOverview = {
  kpis: {
    ytdQuantity: number;
    currentMonthQuantity: number;
    ytdCostExt: number;
    latestMoMQuantityGrowth: number | null;
    latestYoYQuantityGrowth: number | null;
    activeMembers: number;
    topMember: string | null;
    topSku: string | null;
  };
  selectedMember: {
    memberNumber: string;
    memberName: string;
  } | null;
  rollingMonths: Array<{
    month: string;
    quantity: number;
  }>;
  overallRollingMonths: Array<{
    month: string;
    quantity: number;
    activeMembers: number;
    topMember: string | null;
    topSku: string | null;
  }>;
  monthly: Array<{
    month: string;
    quantity: number;
    costExt: number;
    momQuantityGrowth: number | null;
    yoyQuantityGrowth: number | null;
  }>;
  yoyComparison: Array<{
    month: string;
    monthLabel: string;
    currentYear: number;
    priorYear: number;
    currentQuantity: number;
    priorQuantity: number | null;
    quantityGrowth: number | null;
  }>;
  orderClassMonthly: Array<{
    month: string;
    Warehouse: number;
    Direct: number;
    Other: number;
  }>;
  topMembers: Array<{
    name: string;
    memberNumber: string;
    quantity: number;
    costExt: number;
  }>;
  topSkus: Array<{
    name: string;
    description: string | null;
    quantity: number;
    costExt: number;
  }>;
  memberHeatmap: Array<{
    memberNumber: string;
    memberName: string;
    months: Record<string, number>;
  }>;
  skuByMember: Array<{
    name: string;
    memberNumber: string;
    quantity: number;
    costExt: number;
  }>;
  memberRows: Array<{
    memberNumber: string;
    memberName: string;
    quantity: number;
    costExt: number;
    topSku: string | null;
  }>;
  skuRows: Array<{
    sku: string;
    description: string | null;
    quantity: number;
    costExt: number;
    topMember: string | null;
  }>;
  filterOptions: {
    years: string[];
    members: Array<{ value: string; label: string }>;
    skus: string[];
    categories: string[];
    orderClasses: string[];
  };
};

type MidstateMetricRowSelection = {
  postDate: true;
  memberNumber: true;
  memberName: true;
  sku: true;
  description: true;
  orderClass: true;
  category: true;
  quantity: true;
  costExt: true;
};

type MetricTotals = {
  quantity: number;
  costExt: number;
};

type MemberTotals = MetricTotals & {
  memberNumber: string;
  memberName: string;
  skuTotals: Map<string, number>;
};

type SkuTotals = MetricTotals & {
  sku: string;
  description: string | null;
  memberTotals: Map<string, number>;
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

function addMonthsToMonthKey(month: string, offset: number) {
  const [yearText, monthText] = month.split("-");
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + offset);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rollingMonthKeys(latestMonth: string, count = 12) {
  return Array.from({ length: count }, (_, index) =>
    addMonthsToMonthKey(latestMonth, index - count + 1),
  );
}

function latestMonthKey(rows: MidstateMetricRow[]) {
  return rows
    .map((row) => monthKey(row.postDate))
    .sort((a, b) => b.localeCompare(a))[0];
}

function monthLabel(month: number) {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(
    new Date(2026, month - 1, 1),
  );
}

function monthInRange(month: number, startMonth: number, endMonth: number) {
  return month >= startMonth && month <= endMonth;
}

function monthRange(filters: MidstateAnalyticsFilters) {
  return {
    startMonth: filters.startMonth ?? 1,
    endMonth: filters.endMonth ?? 12,
  };
}

function costExt(row: MidstateMetricRow) {
  return Number(row.costExt ?? 0);
}

function addTotals(current: MetricTotals | undefined, row: MidstateMetricRow) {
  const totals = current ?? { quantity: 0, costExt: 0 };
  totals.quantity += row.quantity;
  totals.costExt += costExt(row);
  return totals;
}

function sortByQuantityThenName<T extends { quantity: number; name: string }>(
  rows: T[],
) {
  return rows.sort(
    (a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name),
  );
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b));
}

function matchesFilters(
  row: MidstateMetricRow,
  filters: MidstateAnalyticsFilters,
) {
  return (
    (!filters.memberNumber || row.memberNumber === filters.memberNumber) &&
    (!filters.sku || row.sku === filters.sku) &&
    (!filters.category || row.category === filters.category) &&
    (!filters.orderClass || row.orderClass === filters.orderClass)
  );
}

function matchesFiltersWithoutMember(
  row: MidstateMetricRow,
  filters: MidstateAnalyticsFilters,
) {
  return (
    (!filters.sku || row.sku === filters.sku) &&
    (!filters.category || row.category === filters.category) &&
    (!filters.orderClass || row.orderClass === filters.orderClass)
  );
}

function topMapKey(map: Map<string, number>) {
  return [...map.entries()].sort(
    ([aKey, aValue], [bKey, bValue]) =>
      bValue - aValue || aKey.localeCompare(bKey),
  )[0]?.[0] ?? null;
}

function memberOptionLabel(row: MidstateMetricRow) {
  return `${row.memberName} (${row.memberNumber})`;
}

function quantityRollingMonths(rows: MidstateMetricRow[], keys: string[]) {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const key = monthKey(row.postDate);
    totals.set(key, (totals.get(key) ?? 0) + row.quantity);
  }

  return keys.map((month) => ({
    month,
    quantity: totals.get(month) ?? 0,
  }));
}

function overallRollingMonths(rows: MidstateMetricRow[], keys: string[]) {
  return keys.map((month) => {
    const monthRows = rows.filter((row) => monthKey(row.postDate) === month);
    const memberTotals = new Map<string, number>();
    const skuTotals = new Map<string, number>();

    for (const row of monthRows) {
      memberTotals.set(
        row.memberName,
        (memberTotals.get(row.memberName) ?? 0) + row.quantity,
      );
      skuTotals.set(row.sku, (skuTotals.get(row.sku) ?? 0) + row.quantity);
    }

    return {
      month,
      quantity: monthRows.reduce((sum, row) => sum + row.quantity, 0),
      activeMembers: new Set(monthRows.map((row) => row.memberNumber)).size,
      topMember: topMapKey(memberTotals),
      topSku: topMapKey(skuTotals),
    };
  });
}

export function summarizeMidstateRowsForTest(
  rows: MidstateMetricRow[],
  filters: MidstateAnalyticsFilters,
  filterOptionRows: MidstateMetricRow[] = rows,
): MidstateAnalyticsOverview {
  const parsedFilters = midstateAnalyticsFiltersSchema.parse(filters);
  const year = parsedFilters.year ?? new Date().getFullYear();
  const { startMonth, endMonth } = monthRange(parsedFilters);
  const currentRows = rows.filter(
    (row) =>
      row.postDate.getFullYear() === year &&
      monthInRange(row.postDate.getMonth() + 1, startMonth, endMonth) &&
      matchesFilters(row, parsedFilters),
  );
  const ytdRows = rows.filter(
    (row) =>
      row.postDate.getFullYear() === year &&
      row.postDate.getMonth() + 1 <= endMonth &&
      matchesFilters(row, parsedFilters),
  );
  const priorRows = rows.filter(
    (row) =>
      row.postDate.getFullYear() === year - 1 &&
      monthInRange(row.postDate.getMonth() + 1, startMonth, endMonth) &&
      matchesFilters(row, parsedFilters),
  );
  const growthRows = rows.filter((row) => matchesFilters(row, parsedFilters));
  const monthlyMap = new Map<string, MetricTotals>();
  const growthMonthlyMap = new Map<string, MetricTotals>();
  const priorMonthlyMap = new Map<string, MetricTotals>();
  const orderClassMonthlyMap = new Map<
    string,
    { Warehouse: number; Direct: number; Other: number }
  >();
  const members = new Map<string, MemberTotals>();
  const skus = new Map<string, SkuTotals>();
  const heatmap = new Map<
    string,
    { memberNumber: string; memberName: string; months: Record<string, number> }
  >();

  for (const row of currentRows) {
    const key = monthKey(row.postDate);
    monthlyMap.set(key, addTotals(monthlyMap.get(key), row));

    const orderClassMonth = orderClassMonthlyMap.get(key) ?? {
      Warehouse: 0,
      Direct: 0,
      Other: 0,
    };
    if (row.orderClass === "Warehouse") {
      orderClassMonth.Warehouse += row.quantity;
    } else if (row.orderClass === "Direct") {
      orderClassMonth.Direct += row.quantity;
    } else {
      orderClassMonth.Other += row.quantity;
    }
    orderClassMonthlyMap.set(key, orderClassMonth);

    const member = members.get(row.memberNumber) ?? {
      memberNumber: row.memberNumber,
      memberName: row.memberName,
      quantity: 0,
      costExt: 0,
      skuTotals: new Map<string, number>(),
    };
    member.quantity += row.quantity;
    member.costExt += costExt(row);
    member.skuTotals.set(
      row.sku,
      (member.skuTotals.get(row.sku) ?? 0) + row.quantity,
    );
    members.set(row.memberNumber, member);

    const sku = skus.get(row.sku) ?? {
      sku: row.sku,
      description: row.description,
      quantity: 0,
      costExt: 0,
      memberTotals: new Map<string, number>(),
    };
    sku.quantity += row.quantity;
    sku.costExt += costExt(row);
    sku.memberTotals.set(
      row.memberName,
      (sku.memberTotals.get(row.memberName) ?? 0) + row.quantity,
    );
    skus.set(row.sku, sku);

    const heatmapRow = heatmap.get(row.memberNumber) ?? {
      memberNumber: row.memberNumber,
      memberName: row.memberName,
      months: {},
    };
    heatmapRow.months[key] = (heatmapRow.months[key] ?? 0) + row.quantity;
    heatmap.set(row.memberNumber, heatmapRow);
  }

  for (const row of growthRows) {
    const key = monthKey(row.postDate);
    growthMonthlyMap.set(key, addTotals(growthMonthlyMap.get(key), row));
  }

  for (const row of priorRows) {
    const key = `${year}-${String(row.postDate.getMonth() + 1).padStart(2, "0")}`;
    priorMonthlyMap.set(key, addTotals(priorMonthlyMap.get(key), row));
  }

  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => {
      const previous = growthMonthlyMap.get(previousMonthKey(month));
      const prior = priorMonthlyMap.get(month);

      return {
        month,
        quantity: value.quantity,
        costExt: value.costExt,
        momQuantityGrowth: calculateGrowth(value.quantity, previous?.quantity),
        yoyQuantityGrowth: calculateGrowth(value.quantity, prior?.quantity),
      };
    });
  const yoyComparison = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => {
      const [, monthText] = month.split("-");
      const numericMonth = Number(monthText);
      const prior = priorMonthlyMap.get(month);

      return {
        month: monthText,
        monthLabel: monthLabel(numericMonth),
        currentYear: year,
        priorYear: year - 1,
        currentQuantity: value.quantity,
        priorQuantity: prior?.quantity ?? null,
        quantityGrowth: calculateGrowth(value.quantity, prior?.quantity),
      };
    });
  const orderClassMonthly = [...orderClassMonthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({ month, ...values }));
  const topMembers = sortByQuantityThenName(
    [...members.values()].map((member) => ({
      name: member.memberName,
      memberNumber: member.memberNumber,
      quantity: member.quantity,
      costExt: member.costExt,
    })),
  ).slice(0, 20);
  const topSkus = sortByQuantityThenName(
    [...skus.values()].map((sku) => ({
      name: sku.sku,
      description: sku.description,
      quantity: sku.quantity,
      costExt: sku.costExt,
    })),
  ).slice(0, 20);
  const memberRows = [...members.values()]
    .map((member) => ({
      memberNumber: member.memberNumber,
      memberName: member.memberName,
      quantity: member.quantity,
      costExt: member.costExt,
      topSku: topMapKey(member.skuTotals),
    }))
    .sort(
      (a, b) =>
        b.quantity - a.quantity || a.memberName.localeCompare(b.memberName),
    );
  const skuRows = [...skus.values()]
    .map((sku) => ({
      sku: sku.sku,
      description: sku.description,
      quantity: sku.quantity,
      costExt: sku.costExt,
      topMember: topMapKey(sku.memberTotals),
    }))
    .sort((a, b) => b.quantity - a.quantity || a.sku.localeCompare(b.sku));
  const latestMonth = monthly.at(-1);
  const memberOptions = [
    ...new Map(
      filterOptionRows.map((row) => [
        row.memberNumber,
        { value: row.memberNumber, label: memberOptionLabel(row) },
      ]),
    ).values(),
  ].sort((a, b) => a.label.localeCompare(b.label));
  const latestRollingMonth =
    latestMonthKey(filterOptionRows) ??
    latestMonthKey(rows) ??
    `${year}-${String(endMonth).padStart(2, "0")}`;
  const rollingKeys = rollingMonthKeys(latestRollingMonth);
  const rollingRows = rows.filter((row) => matchesFilters(row, parsedFilters));
  const overallRows = filterOptionRows.filter((row) =>
    matchesFiltersWithoutMember(row, parsedFilters),
  );
  const selectedMember = parsedFilters.memberNumber
    ? (filterOptionRows.find(
        (row) => row.memberNumber === parsedFilters.memberNumber,
      ) ?? null)
    : null;

  return {
    kpis: {
      ytdQuantity: ytdRows.reduce((sum, row) => sum + row.quantity, 0),
      currentMonthQuantity: latestMonth?.quantity ?? 0,
      ytdCostExt: ytdRows.reduce((sum, row) => sum + costExt(row), 0),
      latestMoMQuantityGrowth: latestMonth?.momQuantityGrowth ?? null,
      latestYoYQuantityGrowth: latestMonth?.yoyQuantityGrowth ?? null,
      activeMembers: new Set(currentRows.map((row) => row.memberNumber)).size,
      topMember: topMembers[0]?.name ?? null,
      topSku: topSkus[0]?.name ?? null,
    },
    selectedMember: selectedMember
      ? {
          memberNumber: selectedMember.memberNumber,
          memberName: selectedMember.memberName,
        }
      : null,
    rollingMonths: quantityRollingMonths(rollingRows, rollingKeys),
    overallRollingMonths: overallRollingMonths(overallRows, rollingKeys),
    monthly,
    yoyComparison,
    orderClassMonthly,
    topMembers,
    topSkus,
    memberHeatmap: [...heatmap.values()].sort(
      (a, b) => a.memberName.localeCompare(b.memberName),
    ),
    skuByMember: parsedFilters.sku ? topMembers : [],
    memberRows,
    skuRows,
    filterOptions: {
      years: unique(
        filterOptionRows.map((row) => String(row.postDate.getFullYear())),
      ),
      members: memberOptions,
      skus: unique(filterOptionRows.map((row) => row.sku)),
      categories: unique(filterOptionRows.map((row) => row.category)),
      orderClasses: unique(filterOptionRows.map((row) => row.orderClass)),
    },
  };
}

function normalizeMidstateMetricRows(
  rows: Array<
    Pick<
      MidstateSellThroughRecord,
      | "postDate"
      | "memberNumber"
      | "memberName"
      | "sku"
      | "description"
      | "orderClass"
      | "category"
      | "quantity"
      | "costExt"
    >
  >,
): MidstateMetricRow[] {
  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    costExt: row.costExt === null ? null : Number(row.costExt),
  }));
}

export async function getMidstateAnalytics(
  filters: MidstateAnalyticsFilters,
): Promise<MidstateAnalyticsOverview> {
  const parsedFilters = midstateAnalyticsFiltersSchema.parse(filters);
  const year = parsedFilters.year ?? new Date().getFullYear();
  const { startMonth, endMonth } = monthRange(parsedFilters);
  const { prisma } = await import("@/lib/db");
  const dateWhere = {
    gte: new Date(year - 1, startMonth - 1, 1),
    lt: new Date(year, endMonth, 1),
  };
  const select: MidstateMetricRowSelection = {
    postDate: true,
    memberNumber: true,
    memberName: true,
    sku: true,
    description: true,
    orderClass: true,
    category: true,
    quantity: true,
    costExt: true,
  };
  const [rows, filterOptionRows] = await Promise.all([
    prisma.midstateSellThroughRecord.findMany({
      where: {
        postDate: dateWhere,
        ...(parsedFilters.memberNumber
          ? { memberNumber: parsedFilters.memberNumber }
          : {}),
        ...(parsedFilters.sku ? { sku: parsedFilters.sku } : {}),
        ...(parsedFilters.category ? { category: parsedFilters.category } : {}),
        ...(parsedFilters.orderClass
          ? { orderClass: parsedFilters.orderClass }
          : {}),
      },
      select,
    }),
    prisma.midstateSellThroughRecord.findMany({
      where: {
        postDate: dateWhere,
      },
      select,
    }),
  ]);

  return summarizeMidstateRowsForTest(
    normalizeMidstateMetricRows(rows),
    { ...parsedFilters, year },
    normalizeMidstateMetricRows(filterOptionRows),
  );
}
