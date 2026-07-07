"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartCard } from "@/components/analytics/chart-card";
import { KpiCard } from "@/components/analytics/kpi-card";
import { MonthlyTrendChart } from "@/components/analytics/monthly-trend-chart";
import { RankingBars } from "@/components/analytics/ranking-bars";
import { YoYComparisonChart } from "@/components/analytics/yoy-comparison-chart";
import { MemberHeatmap } from "@/components/analytics/midstate/member-heatmap";
import { MidstateDetailTable } from "@/components/analytics/midstate/midstate-detail-table";
import {
  MidstateFilters,
  type MidstateDashboardFilters,
  type MidstateFilterOptions,
} from "@/components/analytics/midstate/midstate-filters";
import { OrderClassChart } from "@/components/analytics/midstate/order-class-chart";
import { Button } from "@/components/ui/button";
import type { MidstateAnalyticsOverview } from "@/services/midstate/metrics";

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

const defaultFilters: MidstateDashboardFilters = {
  year: currentYear,
  startMonth: "",
  endMonth: "",
  memberNumber: "",
  sku: "",
  category: "",
  orderClass: "",
};

function toRankingRows(
  rows: Array<{ name: string; quantity: number; costExt: number }>,
) {
  return rows.map((row) => ({
    name: row.name,
    quantity: row.quantity,
    revenue: row.costExt,
  }));
}

export function MidstateDashboard() {
  const [analytics, setAnalytics] = useState<MidstateAnalyticsOverview | null>(
    null,
  );
  const [filters, setFilters] =
    useState<MidstateDashboardFilters>(defaultFilters);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);

  const loadAnalytics = useCallback(async (nextFilters: MidstateDashboardFilters) => {
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

      const response = await fetch(
        `/api/analytics/midstate/overview?${params.toString()}`,
        {
          cache: "no-store",
          signal: abortController.signal,
        },
      );
      const data = (await response.json()) as {
        error?: string;
        analytics?: MidstateAnalyticsOverview;
      };

      if (
        abortController.signal.aborted ||
        requestSequence !== requestSequenceRef.current
      ) {
        return;
      }

      if (!response.ok || !data.analytics) {
        throw new Error(data.error ?? "Unable to load Midstate analytics.");
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
          : "Unable to load Midstate analytics.",
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

  const fallbackFilterOptions = useMemo<MidstateFilterOptions>(
    () => ({
      years: [currentYear, String(Number(currentYear) - 1)],
      members: [],
      skus: [],
      categories: [],
      orderClasses: [],
    }),
    [],
  );

  function resetFilters() {
    setIsLoading(true);
    setFilters(defaultFilters);
  }

  function handleFiltersChange(nextFilters: MidstateDashboardFilters) {
    setIsLoading(true);
    setFilters(nextFilters);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <MidstateFilters
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
        <p className="text-sm text-zinc-500">Loading Midstate analytics</p>
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
            <KpiCard
              label="YTD Sell-through Qty"
              value={number(analytics.kpis.ytdQuantity)}
            />
            <KpiCard
              label="Current Month Qty"
              value={`${number(analytics.kpis.currentMonthQuantity)} qty`}
            />
            <KpiCard label="YTD Cost Ext" value={money(analytics.kpis.ytdCostExt)} />
            <KpiCard
              label="Latest MoM"
              value={percent(analytics.kpis.latestMoMQuantityGrowth)}
            />
            <KpiCard
              label="Latest YoY"
              value={percent(analytics.kpis.latestYoYQuantityGrowth)}
            />
            <KpiCard
              label="Active Members"
              value={number(analytics.kpis.activeMembers)}
            />
            <KpiCard
              label="Top Member"
              value={analytics.kpis.topMember ?? "N/A"}
            />
            <KpiCard label="Top SKU" value={analytics.kpis.topSku ?? "N/A"} />
          </div>

          <ChartCard title="Monthly Quantity and Cost Ext">
            <MonthlyTrendChart
              data={analytics.monthly.map((point) => ({
                ...point,
                revenue: point.costExt,
              }))}
            />
          </ChartCard>

          <ChartCard title="YoY Quantity Comparison">
            <YoYComparisonChart data={analytics.yoyComparison} />
          </ChartCard>

          <ChartCard title="Warehouse vs Direct">
            <OrderClassChart data={analytics.orderClassMonthly} />
          </ChartCard>

          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <ChartCard title="Top Members">
              <RankingBars data={toRankingRows(analytics.topMembers)} />
            </ChartCard>
            <ChartCard title="Top SKUs">
              <RankingBars
                data={analytics.topSkus.map((sku) => ({
                  name: sku.description ? `${sku.name} - ${sku.description}` : sku.name,
                  quantity: sku.quantity,
                  revenue: sku.costExt,
                }))}
              />
            </ChartCard>
          </div>

          <ChartCard title="Member Heatmap">
            <MemberHeatmap data={analytics.memberHeatmap} />
          </ChartCard>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <ChartCard title="Member Details">
              <MidstateDetailTable
                columns={[
                  { key: "memberName", label: "Member" },
                  { key: "memberNumber", label: "Member #" },
                  { key: "quantity", label: "Quantity", align: "right" },
                  { key: "costExt", label: "Cost Ext", align: "right" },
                  { key: "topSku", label: "Top SKU" },
                ]}
                rows={analytics.memberRows}
              />
            </ChartCard>
            <ChartCard title="SKU Details">
              <MidstateDetailTable
                columns={[
                  { key: "sku", label: "SKU" },
                  { key: "description", label: "Description" },
                  { key: "quantity", label: "Quantity", align: "right" },
                  { key: "costExt", label: "Cost Ext", align: "right" },
                  { key: "topMember", label: "Top Member" },
                ]}
                rows={analytics.skuRows}
              />
            </ChartCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
