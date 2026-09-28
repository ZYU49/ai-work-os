"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChartCard } from "@/components/analytics/chart-card";
import {
  CustomerMovement,
  type CustomerMovementData,
} from "@/components/analytics/customer-movement";
import { KpiCard } from "@/components/analytics/kpi-card";
import { MonthlyTrendChart } from "@/components/analytics/monthly-trend-chart";
import { RankingBars } from "@/components/analytics/ranking-bars";
import { YoYComparisonChart } from "@/components/analytics/yoy-comparison-chart";
import {
  SalesFilters,
  type SalesDashboardFilters,
  type SalesFilterOptions,
} from "@/components/analytics/sales-filters";
import { Button } from "@/components/ui/button";
import type { SalesReportingPeriod } from "@/services/analytics/reporting-period";

type SalesAnalytics = {
  period: SalesReportingPeriod;
  kpis: {
    ytdQuantity: number;
    ytdRevenue: number;
  };
  monthly: Array<{
    month: string;
    quantity: number | null;
    revenue: number | null;
    momQuantityGrowth: number | null;
    momRevenueGrowth: number | null;
    yoyQuantityGrowth: number | null;
    yoyRevenueGrowth: number | null;
  }>;
  yoyComparison: Array<{
    month: string;
    monthLabel: string;
    currentYear: number;
    priorYear: number;
    currentQuantity: number | null;
    priorQuantity: number | null;
    quantityGrowth: number | null;
    currentRevenue: number | null;
    priorRevenue: number | null;
    revenueGrowth: number | null;
  }>;
  customerMovement: CustomerMovementData;
  topCustomers: Array<{ name: string; quantity: number; revenue: number }>;
  topCategories: Array<{ name: string; quantity: number; revenue: number }>;
  topSkus: Array<{ name: string; quantity: number; revenue: number }>;
  salespeople: Array<{ name: string; quantity: number; revenue: number }>;
  filterOptions: SalesFilterOptions;
};

type YoYMetric = "quantity" | "revenue";

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

const currentYear = String(new Date().getFullYear());

const defaultFilters: SalesDashboardFilters = {
  year: currentYear,
  startMonth: "",
  endMonth: "",
  salesperson: "",
  customerName: "",
  category: "",
  sku: "",
  shipToState: "",
  memberName: "",
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

const periodLabels = { month: "Month", ytd: "YTD", period: "Period" };

function scopeLabel(period: SalesReportingPeriod) {
  const { currentYear, startMonth, endMonth, kind, months } = period;
  const prefix = `Scope: ${currentYear} ${periodLabels[kind]}`;
  if (months.length === 0) {
    return `${prefix} - data unavailable`;
  }
  const rangeLabel =
    startMonth === endMonth
      ? monthNames[startMonth - 1]
      : `${monthNames[startMonth - 1]}-${monthNames[endMonth - 1]}`;

  const coverage = period.missingCurrentMonths.length === 0
    ? ""
    : period.missingCurrentMonths.length === months.length
      ? " - data unavailable"
      : " - partial data";
  return `${prefix} ${rangeLabel}${coverage}`;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [filterOptions, setFilterOptions] = useState<SalesFilterOptions | null>(null);
  const [filters, setFilters] = useState<SalesDashboardFilters>(defaultFilters);
  const [yoyMetric, setYoyMetric] = useState<YoYMetric>("quantity");
  const [movementPeriod, setMovementPeriod] = useState("ytd");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);

  const latestMonth = analytics?.monthly.at(-1);
  const period = analytics?.period;
  const currentScopeLabel = period ? scopeLabel(period) : "";
  const periodLabel = period ? periodLabels[period.kind] : "";
  const availableMonthCount = period?.months.filter((month) =>
    period.availableCurrentMonths.includes(month),
  ).length ?? 0;
  const coverageDetail = period
    ? availableMonthCount === 0
      ? `Data unavailable for ${period.currentYear}`
      : period.missingCurrentMonths.length > 0
        ? `Partial data: ${availableMonthCount} of ${period.months.length} months available`
        : undefined
    : undefined;

  const loadAnalytics = useCallback(async (nextFilters: SalesDashboardFilters) => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const requestSequence = ++requestSequenceRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(nextFilters)) {
        if (value) {
          params.set(key, value);
        }
      }

      const response = await fetch(`/api/analytics/sales?${params.toString()}`, {
        cache: "no-store",
        signal: abortController.signal,
      });
      const data = await response.json();

      if (
        abortController.signal.aborted ||
        requestSequence !== requestSequenceRef.current
      ) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load sales analytics.");
      }

      setAnalytics(data.analytics);
      const nextOptions: SalesFilterOptions = data.analytics.filterOptions;
      setFilterOptions((previous) => ({
        ...nextOptions,
        years: Array.from(new Set([
          currentYear,
          String(Number(currentYear) - 1),
          ...(previous?.years ?? []),
          ...nextOptions.years,
        ])).sort(),
      }));
      setMovementPeriod(data.analytics.customerMovement.defaultPeriod);
    } catch (loadError) {
      if (
        abortController.signal.aborted ||
        requestSequence !== requestSequenceRef.current
      ) {
        return;
      }

      setAnalytics(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load sales analytics.",
      );
    } finally {
      if (
        abortController.signal.aborted ||
        requestSequence !== requestSequenceRef.current
      ) {
        return;
      }

      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAnalytics(filters);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [filters, loadAnalytics]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const fallbackFilterOptions = useMemo<SalesFilterOptions>(
    () => ({
      years: [currentYear, String(Number(currentYear) - 1)],
      salespeople: [],
      customers: [],
      categories: [],
      skus: [],
      states: [],
      members: [],
    }),
    [],
  );

  function resetFilters() {
    handleFiltersChange({ ...defaultFilters });
  }

  function handleFiltersChange(nextFilters: SalesDashboardFilters) {
    // Invalidate before the effect's deferred request can start.
    abortControllerRef.current?.abort();
    requestSequenceRef.current += 1;
    setError(null);
    setIsLoading(true);
    setFilters(nextFilters);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SalesFilters
          filters={filters}
          options={filterOptions ?? fallbackFilterOptions}
          onChange={handleFiltersChange}
          onReset={resetFilters}
        />
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              void loadAnalytics(filters);
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading sales analytics</p>
      ) : null}
      {error ? (
        <p
          role="status"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      {analytics && !isLoading ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label={`${periodLabel} Quantity`}
              value={availableMonthCount > 0 ? number(analytics.kpis.ytdQuantity) : "Unavailable"}
              detail={coverageDetail}
            />
            <KpiCard
              label={`${periodLabel} Sales`}
              value={availableMonthCount > 0 ? money(analytics.kpis.ytdRevenue) : "Unavailable"}
              detail={coverageDetail}
            />
            <KpiCard
              label="Latest MoM"
              value={`Qty ${percent(latestMonth?.momQuantityGrowth ?? null)}`}
              detail={`Rev ${percent(latestMonth?.momRevenueGrowth ?? null)}${latestMonth ? ` · ${latestMonth.month}` : ""}`}
            />
            <KpiCard
              label="Latest YoY"
              value={`Qty ${percent(latestMonth?.yoyQuantityGrowth ?? null)}`}
              detail={`Rev ${percent(latestMonth?.yoyRevenueGrowth ?? null)}${latestMonth ? ` · ${latestMonth.month}` : ""}`}
            />
          </div>

          <ChartCard title="Monthly Quantity and Sales" subtitle={currentScopeLabel}>
            <MonthlyTrendChart data={analytics.monthly} />
          </ChartCard>

          <ChartCard
            title="YoY Comparison"
            subtitle={currentScopeLabel}
            action={
              <Link
                href="/analytics/product-yoy"
                className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
              >
                Product YoY Table
              </Link>
            }
          >
            <div className="mb-4 inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-1">
              <button
                type="button"
                aria-pressed={yoyMetric === "quantity"}
                onClick={() => setYoyMetric("quantity")}
                className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                  yoyMetric === "quantity"
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-white hover:text-zinc-950"
                }`}
              >
                Quantity
              </button>
              <button
                type="button"
                aria-pressed={yoyMetric === "revenue"}
                onClick={() => setYoyMetric("revenue")}
                className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                  yoyMetric === "revenue"
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-white hover:text-zinc-950"
                }`}
              >
                Sales Dollars
              </button>
            </div>
            <YoYComparisonChart
              data={analytics.yoyComparison}
              metric={yoyMetric === "quantity" ? "quantity" : "revenue"}
            />
          </ChartCard>

          <CustomerMovement
            data={analytics.customerMovement}
            period={movementPeriod}
            onPeriodChange={setMovementPeriod}
          />

          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <ChartCard title="Top Customers" subtitle={currentScopeLabel}>
              <RankingBars data={analytics.topCustomers} />
            </ChartCard>
            <ChartCard title="Top Categories" subtitle={currentScopeLabel}>
              <RankingBars data={analytics.topCategories} />
            </ChartCard>
            <ChartCard title="Top SKUs / Products" subtitle={currentScopeLabel}>
              <RankingBars data={analytics.topSkus} />
            </ChartCard>
            <ChartCard title="Salesperson Split" subtitle={currentScopeLabel}>
              <RankingBars data={analytics.salespeople} />
            </ChartCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
