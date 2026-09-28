"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { utils, writeFile } from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SalesReportingPeriod } from "@/services/analytics/reporting-period";

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
  period: SalesReportingPeriod;
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

function fileSafe(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "All_Customers";
}

function periodLabel(period: SalesReportingPeriod) {
  return period.kind === "ytd" ? "YTD" : period.kind === "month" ? "Month" : "Period";
}

function periodRange(period: SalesReportingPeriod) {
  if (!period.months.length) return "";
  const start = monthNames[period.startMonth - 1];
  const end = monthNames[period.endMonth - 1];
  return period.startMonth === period.endMonth ? start : `${start}-${end}`;
}

function scopeLabel(analytics: ProductYoYAnalytics, customerName: string) {
  const customerScope = customerName ? ` · Customer: ${customerName}` : "";
  const range = periodRange(analytics.period);
  return `Scope: ${analytics.currentYear} ${periodLabel(analytics.period)}${range ? ` ${range}` : ""}${customerScope}`;
}

function exportFileName(analytics: ProductYoYAnalytics, customerName: string) {
  const customerScope = customerName ? fileSafe(customerName) : "All_Customers";
  const range = periodRange(analytics.period);
  return `Product_YoY_${customerScope}_${analytics.currentYear}_${periodLabel(analytics.period)}${range ? `_${range}` : ""}.xlsx`;
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
  const [resolvedCustomerName, setResolvedCustomerName] = useState("");
  const [customers, setCustomers] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestVersion = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const version = ++requestVersion.current;
    const isLatestRequest = () => isMounted && version === requestVersion.current;

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

        if (!isLatestRequest()) {
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load product YoY analytics.");
        }

        setAnalytics(data.analytics);
        setResolvedCustomerName(customerName);
        setCustomers(data.analytics.filterOptions.customers);
      } catch (loadError) {
        if (!isLatestRequest()) {
          return;
        }

        setAnalytics(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load product YoY analytics.",
        );
      } finally {
        if (isLatestRequest()) {
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

  const period = analytics?.period;
  const currentAvailable = !!period?.months.some((month) => period.availableCurrentMonths.includes(month));
  const priorAvailable = !!period?.months.some((month) => period.availablePriorMonths.includes(month));
  const coverageComplete = !!period && currentAvailable && priorAvailable &&
    period.missingCurrentMonths.length === 0 && period.missingPriorMonths.length === 0;
  const currentDetail = period?.missingCurrentMonths.length && currentAvailable ? "Partial coverage" : undefined;
  const priorDetail = period?.missingPriorMonths.length && priorAvailable ? "Partial coverage" : undefined;
  const headingPeriod = period ? periodLabel(period) : "";
  const canExport = !!analytics && !isLoading && !error &&
    customerName === resolvedCustomerName && coverageComplete && rows.length > 0;

  function exportVisibleRows() {
    if (!analytics || !canExport) {
      return;
    }

    const worksheet = utils.json_to_sheet(
      rows.map((row, index) => ({
        "Line Item": index + 1,
        "SKU / Item": row.sku,
        Description: row.description || "-",
        [`${analytics.currentYear} Qty`]: row.currentQuantity,
        [`${analytics.priorYear} Qty`]: row.priorQuantity,
        "Qty Diff": row.quantityDiff,
        "Qty YoY %": percent(row.quantityGrowth),
      })),
    );
    const workbook = utils.book_new();

    utils.book_append_sheet(workbook, worksheet, "Product YoY");
    writeFile(workbook, exportFileName(analytics, resolvedCustomerName));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="rounded-md border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Product YoY Performance
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {isLoading ? "Loading product YoY scope" : analytics
                ? scopeLabel(analytics, resolvedCustomerName)
                : error ? "Product YoY scope unavailable" : "Loading product YoY scope"}
            </p>
          </div>
          <div className="grid w-full gap-3 sm:w-64">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-600">
              Customer
              <select
                value={customerName}
                onChange={(event) => {
                  if (event.target.value === customerName) return;
                  requestVersion.current += 1;
                  setIsLoading(true);
                  setCustomerName(event.target.value);
                }}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
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

        {analytics && !error && !isLoading ? (
          <>
            {!coverageComplete ? (
              <div role="status" id="product-yoy-coverage" className="border-b border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">Incomplete coverage. Comparisons unavailable. Export disabled.</p>
                {period ? (
                  <>
                    {period.missingCurrentMonths.length > 0 ? <p>{analytics.currentYear}: missing {period.missingCurrentMonths.map((month) => monthNames[month - 1]).join(", ")}. {!currentAvailable ? "Year unavailable." : "Totals are partial."}</p> : null}
                    {period.missingPriorMonths.length > 0 ? <p>{analytics.priorYear}: missing {period.missingPriorMonths.map((month) => monthNames[month - 1]).join(", ")}. {!priorAvailable ? "Year unavailable." : "Totals are partial."}</p> : null}
                  </>
                ) : <p>Reporting coverage unavailable.</p>}
              </div>
            ) : null}
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
                  label={`${analytics.currentYear} ${headingPeriod} Qty`}
                  value={currentAvailable ? number(analytics.summary.currentQuantity) : "Unavailable"}
                  detail={currentDetail}
                />
                <SummaryMetric
                  label={`${analytics.priorYear} ${headingPeriod} Qty`}
                  value={priorAvailable ? number(analytics.summary.priorQuantity) : "Unavailable"}
                  detail={priorDetail}
                />
                <SummaryMetric
                  label="Qty Diff"
                  value={coverageComplete ? number(analytics.summary.quantityDiff) : "Unavailable"}
                  detail={coverageComplete ? `Qty YoY ${percent(analytics.summary.quantityGrowth)}` : undefined}
                />
                <SummaryMetric
                  label="Qty YoY"
                  value={coverageComplete ? percent(analytics.summary.quantityGrowth) : "Unavailable"}
                  detail={coverageComplete ? `${analytics.summary.newItemCount} new · ${analytics.summary.lostItemCount} lost` : undefined}
                />
                <SummaryMetric
                  label={`${analytics.currentYear} ${headingPeriod} Sales`}
                  value={currentAvailable ? money(analytics.summary.currentRevenue) : "Unavailable"}
                  detail={currentDetail}
                />
                <SummaryMetric
                  label={`${analytics.priorYear} ${headingPeriod} Sales`}
                  value={priorAvailable ? money(analytics.summary.priorRevenue) : "Unavailable"}
                  detail={priorDetail}
                />
                <SummaryMetric
                  label="Sales Diff"
                  value={coverageComplete ? money(analytics.summary.revenueDiff) : "Unavailable"}
                  detail={coverageComplete ? `Sales YoY ${percent(analytics.summary.revenueGrowth)}` : undefined}
                />
                <SummaryMetric
                  label="Sales YoY"
                  value={coverageComplete ? percent(analytics.summary.revenueGrowth) : "Unavailable"}
                />
              </div>
            </div>
          </>
        ) : null}
        {isLoading || (analytics && !error) ? (
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              {analytics && !isLoading ? <h3 className="text-sm font-semibold text-zinc-950">
                Item Detail · {number(analytics.summary.lineItemCount)} line items
              </h3> : null}
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <div className="w-full sm:w-80">
                  <label htmlFor="product-yoy-search" className="sr-only">
                    Search products
                  </label>
                  <Input
                    id="product-yoy-search"
                    aria-label="Search products"
                    value={query}
                    disabled={isLoading}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search SKU or description"
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={exportVisibleRows}
                  disabled={!canExport}
                  aria-describedby={!isLoading && !coverageComplete ? "product-yoy-coverage" : undefined}
                  className="w-full sm:w-auto"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Export Excel
                </Button>
              </div>
            </div>
        ) : null}
        {analytics && !error && !isLoading ? (
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
                      {currentAvailable ? number(row.currentQuantity) : "Unavailable"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-600">
                      {priorAvailable ? number(row.priorQuantity) : "Unavailable"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-950">
                      {coverageComplete ? number(row.quantityDiff) : "Unavailable"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right ${quantityGrowthClassName(
                        coverageComplete ? row.quantityGrowth : null,
                      )}`}
                    >
                      {coverageComplete ? percent(row.quantityGrowth) : "Unavailable"}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
        ) : null}
      </div>
    </div>
  );
}
