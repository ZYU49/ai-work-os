"use client";

import { ChartCard } from "@/components/analytics/chart-card";

export type CustomerMovementRow = {
  customerName: string;
  salesperson: string | null;
  currentQuantity: number;
  priorQuantity: number;
  quantityDiff: number;
  quantityGrowth: number | null;
  currentRevenue: number;
  priorRevenue: number;
  revenueDiff: number;
  revenueGrowth: number | null;
};

export type CustomerMovementData = {
  defaultPeriod: string;
  periods: Array<{ value: string; label: string }>;
  byPeriod: Record<
    string,
    {
      period: string;
      label: string;
      summary: {
        currentQuantity: number;
        priorQuantity: number;
        quantityDiff: number;
        quantityGrowth: number | null;
        currentRevenue: number;
        priorRevenue: number;
        revenueDiff: number;
        revenueGrowth: number | null;
      };
      declining: CustomerMovementRow[];
      growing: CustomerMovementRow[];
    }
  >;
};

function money(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function percent(value: number | null) {
  return value === null
    ? "N/A"
    : new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
}

function movementRowsTable(rows: CustomerMovementRow[], emptyText: string) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-zinc-500">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-left text-xs uppercase text-zinc-500">
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 text-right font-medium">2026 Qty</th>
            <th className="px-4 py-3 text-right font-medium">2025 Qty</th>
            <th className="px-4 py-3 text-right font-medium">Qty Diff</th>
            <th className="px-4 py-3 text-right font-medium">YoY</th>
            <th className="px-4 py-3 text-right font-medium">Sales Diff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.customerName}
              className="border-b border-zinc-100 last:border-0"
            >
              <td className="px-4 py-3 font-medium text-zinc-950">
                {row.customerName}
              </td>
              <td className="px-4 py-3 text-right text-zinc-900">
                {number(row.currentQuantity)}
              </td>
              <td className="px-4 py-3 text-right text-zinc-600">
                {number(row.priorQuantity)}
              </td>
              <td
                className={`px-4 py-3 text-right font-medium ${
                  row.quantityDiff < 0 ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {number(row.quantityDiff)}
              </td>
              <td
                className={`px-4 py-3 text-right ${
                  row.quantityGrowth !== null && row.quantityGrowth < 0
                    ? "text-red-600"
                    : "text-zinc-700"
                }`}
              >
                {percent(row.quantityGrowth)}
              </td>
              <td
                className={`px-4 py-3 text-right ${
                  row.revenueDiff < 0 ? "text-red-600" : "text-zinc-700"
                }`}
              >
                {money(row.revenueDiff)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CustomerMovement({
  data,
  period,
  onPeriodChange,
}: {
  data: CustomerMovementData;
  period: string;
  onPeriodChange: (period: string) => void;
}) {
  const selectedMovement =
    data.byPeriod[period] ??
    data.byPeriod[data.defaultPeriod] ??
    data.byPeriod.ytd;

  if (!selectedMovement) {
    return null;
  }

  return (
    <ChartCard
      title="Customer Movement"
      subtitle={`Default view follows the latest loaded month: ${selectedMovement.label}`}
      action={
        <label className="flex min-w-40 flex-col gap-1 text-xs font-medium text-zinc-600">
          Movement Period
          <select
            value={selectedMovement.period}
            onChange={(event) => onPeriodChange(event.target.value)}
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 outline-none focus:border-zinc-400"
          >
            {data.periods.map((periodOption) => (
              <option key={periodOption.value} value={periodOption.value}>
                {periodOption.label}
              </option>
            ))}
          </select>
        </label>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">2026 Qty</p>
          <p className="mt-2 text-xl font-semibold text-zinc-950">
            {number(selectedMovement.summary.currentQuantity)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">2025 Qty</p>
          <p className="mt-2 text-xl font-semibold text-zinc-950">
            {number(selectedMovement.summary.priorQuantity)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">
            Qty Diff
          </p>
          <p
            className={`mt-2 text-xl font-semibold ${
              selectedMovement.summary.quantityDiff < 0
                ? "text-red-600"
                : "text-emerald-700"
            }`}
          >
            Qty Diff {number(selectedMovement.summary.quantityDiff)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            YoY {percent(selectedMovement.summary.quantityGrowth)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">
            Sales Diff
          </p>
          <p
            className={`mt-2 text-xl font-semibold ${
              selectedMovement.summary.revenueDiff < 0
                ? "text-red-600"
                : "text-emerald-700"
            }`}
          >
            Sales Diff {money(selectedMovement.summary.revenueDiff)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            YoY {percent(selectedMovement.summary.revenueGrowth)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-md border border-zinc-200">
          <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-950">
              Top Declining Customers
            </h3>
          </div>
          {movementRowsTable(
            selectedMovement.declining,
            "No declining customers in this period.",
          )}
        </div>
        <div className="overflow-hidden rounded-md border border-zinc-200">
          <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-950">
              Top Growing Customers
            </h3>
          </div>
          {movementRowsTable(
            selectedMovement.growing,
            "No growing customers in this period.",
          )}
        </div>
      </div>
    </ChartCard>
  );
}
