"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type ProductYoYRow = {
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

type ProductYoYAnalytics = {
  currentYear: number;
  priorYear: number;
  months: number[];
  summary: ProductYoYSummary;
  filterOptions: {
    customers: string[];
  };
  rows: ProductYoYRow[];
};

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function quantityGrowthClassName(value: number | null) {
  return value !== null && value < 0 ? "text-red-600" : "text-zinc-950";
}

function scopeLabel(analytics: ProductYoYAnalytics, customerName: string) {
  const months = analytics.months;
  const customerScope = customerName ? ` · Customer: ${customerName}` : "";

  if (!months.length) {
    return `Scope: ${analytics.currentYear} YTD${customerScope}`;
  }

  return `Scope: ${analytics.currentYear} YTD ${monthNames[months[0] - 1]}-${
    monthNames[months[months.length - 1] - 1]
  }${customerScope}`;
}

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-zinc-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  );
}

export function ProductYoYDashboard() {
  const [analytics, setAnalytics] = useState<ProductYoYAnalytics | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProductYoY() {
      setError(null);
      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        if (customerName) {
          params.set("customerName", customerName);
        }
        const url = params.toString()
          ? `/api/analytics/product-yoy?${params.toString()}`
          : "/api/analytics/product-yoy";
        const response = await fetch(url, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load product YoY analytics.");
        }

        setAnalytics(data.analytics);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setAnalytics(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load product YoY analytics.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProductYoY();

    return () => {
      isMounted = false;
    };
  }, [customerName]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const baseRows = analytics?.rows ?? [];

    if (!normalizedQuery) {
      return baseRows;
    }

    return baseRows.filter(
      (row) =>
        row.sku.toLowerCase().includes(normalizedQuery) ||
        row.description.toLowerCase().includes(normalizedQuery),
    );
  }, [analytics?.rows, query]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Product YoY Performance
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {analytics
                ? scopeLabel(analytics, customerName)
                : "Loading product YoY scope"}
            </p>
          </div>
          <div className="grid w-full gap-3 sm:w-64">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-600">
              Customer
              <select
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
              >
                <option value="">All Customers</option>
                {(analytics?.filterOptions.customers ?? []).map((customer) => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-zinc-500">Loading product YoY analytics</p>
        ) : null}
        {error ? (
          <p
            role="status"
            className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        {analytics && !error ? (
          <>
            <div className="border-b border-zinc-100 p-4">
              <h3 className="text-sm font-semibold text-zinc-950">
                Overall Summary
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryMetric
                  label="Line Items"
                  value={number(analytics.summary.lineItemCount)}
                  detail="SKU rows in item detail"
                />
                <SummaryMetric
                  label={`${analytics.currentYear} YTD Qty`}
                  value={number(analytics.summary.currentQuantity)}
                />
                <SummaryMetric
                  label={`${analytics.priorYear} YTD Qty`}
                  value={number(analytics.summary.priorQuantity)}
                />
                <SummaryMetric
                  label="Qty Diff"
                  value={number(analytics.summary.quantityDiff)}
                  detail={`Qty YoY ${percent(analytics.summary.quantityGrowth)}`}
                />
                <SummaryMetric
                  label="Qty YoY"
                  value={percent(analytics.summary.quantityGrowth)}
                  detail={`${analytics.summary.newItemCount} new · ${analytics.summary.lostItemCount} lost`}
                />
                <SummaryMetric
                  label={`${analytics.currentYear} YTD Sales`}
                  value={money(analytics.summary.currentRevenue)}
                />
                <SummaryMetric
                  label={`${analytics.priorYear} YTD Sales`}
                  value={money(analytics.summary.priorRevenue)}
                />
                <SummaryMetric
                  label="Sales Diff"
                  value={money(analytics.summary.revenueDiff)}
                  detail={`Sales YoY ${percent(analytics.summary.revenueGrowth)}`}
                />
                <SummaryMetric
                  label="Sales YoY"
                  value={percent(analytics.summary.revenueGrowth)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-zinc-950">
                Item Detail · {number(analytics.summary.lineItemCount)} line items
              </h3>
              <div className="w-full sm:w-80">
                <label htmlFor="product-yoy-search" className="sr-only">
                  Search products
                </label>
                <Input
                  id="product-yoy-search"
                  aria-label="Search products"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search SKU or description"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Line Item
                  </th>
                  <th scope="col" className="px-4 py-3">
                    SKU / Item
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {analytics.currentYear} Qty
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {analytics.priorYear} Qty
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Qty Diff
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Qty YoY %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row, index) => (
                  <tr key={row.sku} className="hover:bg-zinc-50">
                    <td
                      data-testid="product-yoy-line-item"
                      className="whitespace-nowrap px-4 py-3 font-medium text-zinc-500"
                    >
                      {number(index + 1)}
                    </td>
                    <td
                      data-testid="product-yoy-sku"
                      className="whitespace-nowrap px-4 py-3 font-medium text-zinc-950"
                    >
                      {row.sku}
                    </td>
                    <td className="max-w-xl px-4 py-3 text-zinc-600">
                      {row.description || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-950">
                      {number(row.currentQuantity)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-600">
                      {number(row.priorQuantity)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-950">
                      {number(row.quantityDiff)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right ${quantityGrowthClassName(
                        row.quantityGrowth,
                      )}`}
                    >
                      {percent(row.quantityGrowth)}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
