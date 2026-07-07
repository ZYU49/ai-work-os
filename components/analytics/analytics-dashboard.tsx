"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartCard } from "@/components/analytics/chart-card";
import { KpiCard } from "@/components/analytics/kpi-card";
import { MonthlyTrendChart } from "@/components/analytics/monthly-trend-chart";
import { RankingBars } from "@/components/analytics/ranking-bars";
import {
  SalesFilters,
  type SalesDashboardFilters,
  type SalesFilterOptions,
} from "@/components/analytics/sales-filters";
import { Button } from "@/components/ui/button";

type SalesAnalytics = {
  kpis: {
    ytdQuantity: number;
    ytdRevenue: number;
    averageUnitPrice: number | null;
    activeCustomers: number;
  };
  monthly: Array<{
    month: string;
    quantity: number;
    revenue: number;
    momQuantityGrowth: number | null;
    momRevenueGrowth: number | null;
    yoyQuantityGrowth: number | null;
    yoyRevenueGrowth: number | null;
  }>;
  topCustomers: Array<{ name: string; quantity: number; revenue: number }>;
  topCategories: Array<{ name: string; quantity: number; revenue: number }>;
  topSkus: Array<{ name: string; quantity: number; revenue: number }>;
  salespeople: Array<{ name: string; quantity: number; revenue: number }>;
  filterOptions: SalesFilterOptions;
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

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [filters, setFilters] = useState<SalesDashboardFilters>(defaultFilters);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);

  const latestMonth = analytics?.monthly.at(-1);

  const loadAnalytics = useCallback(async (nextFilters: SalesDashboardFilters) => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const requestSequence = ++requestSequenceRef.current;

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
    setIsLoading(true);
    setFilters(defaultFilters);
  }

  function handleFiltersChange(nextFilters: SalesDashboardFilters) {
    setIsLoading(true);
    setFilters(nextFilters);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SalesFilters
          filters={filters}
          options={analytics?.filterOptions ?? fallbackFilterOptions}
          onChange={handleFiltersChange}
          onReset={resetFilters}
        />
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setIsLoading(true);
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

      {analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="YTD Quantity" value={number(analytics.kpis.ytdQuantity)} />
            <KpiCard label="YTD Sales" value={money(analytics.kpis.ytdRevenue)} />
            <KpiCard
              label="Avg Unit Price"
              value={
                analytics.kpis.averageUnitPrice === null
                  ? "N/A"
                  : money(analytics.kpis.averageUnitPrice)
              }
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
            <KpiCard
              label="Active Customers"
              value={number(analytics.kpis.activeCustomers)}
            />
          </div>

          <ChartCard title="Monthly Quantity and Sales">
            <MonthlyTrendChart data={analytics.monthly} />
          </ChartCard>

          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <ChartCard title="Top Customers">
              <RankingBars data={analytics.topCustomers} />
            </ChartCard>
            <ChartCard title="Top Categories">
              <RankingBars data={analytics.topCategories} />
            </ChartCard>
            <ChartCard title="Top SKUs / Products">
              <RankingBars data={analytics.topSkus} />
            </ChartCard>
            <ChartCard title="Salesperson Split">
              <RankingBars data={analytics.salespeople} />
            </ChartCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
