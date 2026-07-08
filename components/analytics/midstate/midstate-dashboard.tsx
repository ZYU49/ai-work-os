"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MidstateFilters,
  type MidstateDashboardFilters,
  type MidstateFilterOptions,
} from "@/components/analytics/midstate/midstate-filters";
import {
  QuantityRollingChart,
  type QuantityChartMode,
} from "@/components/analytics/midstate/quantity-rolling-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MidstateAnalyticsOverview } from "@/services/midstate/metrics";

const defaultFilters: MidstateDashboardFilters = {
  memberNumber: "",
};

type DetailTab = "rolling" | "ranking";

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function latest<T>(rows: T[]) {
  return rows.at(-1) ?? null;
}

function totalQuantity(rows: Array<{ quantity: number }>) {
  return rows.reduce((sum, row) => sum + row.quantity, 0);
}

function categoryLabel(value: string | null) {
  return value?.trim() || "Uncategorized";
}

function chartTitle(analytics: MidstateAnalyticsOverview | null) {
  return analytics?.selectedMember
    ? `${analytics.selectedMember.memberName} Rolling 12 Months`
    : "Member Rolling 12 Months";
}

function summarySentence(analytics: MidstateAnalyticsOverview) {
  const latestMonth = latest(analytics.overallRollingMonths);
  const month = latestMonth?.month ?? "latest month";
  const member = analytics.kpis.topMember ?? "N/A";
  const sku = analytics.kpis.topSku ?? "N/A";

  return `${month} sell-through is ${number(latestMonth?.quantity ?? 0)} units. Top member is ${member}, and top SKU is ${sku}.`;
}

function ModeToggle({
  value,
  onChange,
}: {
  value: QuantityChartMode;
  onChange: (value: QuantityChartMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
      {(["line", "bar"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
            value === mode
              ? "bg-zinc-950 text-white"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
          }`}
        >
          {mode === "line" ? "Line" : "Bar"}
        </button>
      ))}
    </div>
  );
}

function RollingChartCard({
  title,
  data,
  mode,
  onModeChange,
  emptyState,
}: {
  title: string;
  data: Array<{ month: string; quantity: number }>;
  mode: QuantityChartMode;
  onModeChange: (mode: QuantityChartMode) => void;
  emptyState: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{title}</CardTitle>
        <ModeToggle value={mode} onChange={onModeChange} />
      </CardHeader>
      <CardContent>
        <QuantityRollingChart data={data} mode={mode} emptyState={emptyState} />
      </CardContent>
    </Card>
  );
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
    <div className="min-w-0 rounded-md border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-semibold leading-7 text-zinc-950">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  );
}

function RollingTable({
  rows,
}: {
  rows: MidstateAnalyticsOverview["overallRollingMonths"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-normal text-zinc-500">
            <th className="py-2 pr-4">Month</th>
            <th className="px-4 py-2 text-right">Total Quantity</th>
            <th className="px-4 py-2 text-right">Active Members</th>
            <th className="px-4 py-2">Top Member</th>
            <th className="py-2 pl-4">Top SKU</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month} className="border-b border-zinc-100 last:border-0">
              <td className="py-2 pr-4 font-medium text-zinc-950">{row.month}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {number(row.quantity)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {number(row.activeMembers)}
              </td>
              <td className="max-w-[260px] truncate px-4 py-2">
                {row.topMember ?? "N/A"}
              </td>
              <td className="py-2 pl-4">{row.topSku ?? "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-950 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
      }`}
    >
      {children}
    </button>
  );
}

function ItemRankingTable({
  rows,
}: {
  rows: MidstateAnalyticsOverview["itemRankings"];
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        No item rankings for this item group.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-normal text-zinc-500">
            <th className="py-2 pr-4 text-right">Ranking</th>
            <th className="px-4 py-2">Item Number</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2">Item Group</th>
            <th className="py-2 pl-4 text-right">Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.category ?? "uncategorized"}-${row.itemNumber}`}
              className="border-b border-zinc-100 last:border-0"
            >
              <td className="py-2 pr-4 text-right font-medium tabular-nums text-zinc-950">
                {row.rank}
              </td>
              <td className="px-4 py-2 font-medium text-zinc-950">
                {row.itemNumber}
              </td>
              <td className="max-w-[320px] truncate px-4 py-2 text-zinc-600">
                {row.description ?? "N/A"}
              </td>
              <td className="px-4 py-2 text-zinc-600">
                {categoryLabel(row.category)}
              </td>
              <td className="py-2 pl-4 text-right tabular-nums text-zinc-700">
                {number(row.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RollingDetailsCard({
  activeTab,
  category,
  onCategoryChange,
  onTabChange,
  analytics,
}: {
  activeTab: DetailTab;
  category: string;
  onCategoryChange: (value: string) => void;
  onTabChange: (tab: DetailTab) => void;
  analytics: MidstateAnalyticsOverview;
}) {
  const categoryOptions = [
    ...new Set(analytics.itemRankings.map((row) => categoryLabel(row.category))),
  ].sort((a, b) => a.localeCompare(b));
  const filteredRankings = category
    ? analytics.itemRankings.filter(
        (row) => categoryLabel(row.category) === category,
      )
    : analytics.itemRankings;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
          <DetailTabButton
            active={activeTab === "rolling"}
            onClick={() => onTabChange("rolling")}
          >
            Rolling 12-Month Table
          </DetailTabButton>
          <DetailTabButton
            active={activeTab === "ranking"}
            onClick={() => onTabChange("ranking")}
          >
            Item Ranking by Item Group
          </DetailTabButton>
        </div>
        {activeTab === "ranking" ? (
          <label className="flex min-w-56 flex-col gap-1 text-sm font-medium text-zinc-700">
            Item Group
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
            >
              <option value="">All Item Groups</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <CardTitle>Rolling 12-Month Table</CardTitle>
        )}
      </CardHeader>
      <CardContent>
        {activeTab === "rolling" ? (
          <RollingTable rows={analytics.overallRollingMonths} />
        ) : (
          <ItemRankingTable rows={filteredRankings} />
        )}
      </CardContent>
    </Card>
  );
}

export function MidstateDashboard() {
  const [analytics, setAnalytics] = useState<MidstateAnalyticsOverview | null>(
    null,
  );
  const [filters, setFilters] =
    useState<MidstateDashboardFilters>(defaultFilters);
  const [memberChartMode, setMemberChartMode] =
    useState<QuantityChartMode>("line");
  const [overallChartMode, setOverallChartMode] =
    useState<QuantityChartMode>("line");
  const [detailTab, setDetailTab] = useState<DetailTab>("rolling");
  const [itemCategory, setItemCategory] = useState("");
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
      if (nextFilters.memberNumber) {
        params.set("memberNumber", nextFilters.memberNumber);
      }

      const query = params.toString();
      const response = await fetch(
        `/api/analytics/midstate/overview${query ? `?${query}` : ""}`,
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
      members: [],
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

  const latestOverall = analytics ? latest(analytics.overallRollingMonths) : null;
  const latestMember = analytics ? latest(analytics.rollingMonths) : null;
  const memberData = analytics?.selectedMember ? analytics.rollingMonths : [];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <MidstateFilters
        filters={filters}
        options={analytics?.filterOptions ?? fallbackFilterOptions}
        onChange={handleFiltersChange}
        onReset={resetFilters}
      />

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
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-zinc-600">
                {summarySentence(analytics)}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryMetric
                  label="Rolling 12 Qty"
                  value={number(totalQuantity(analytics.overallRollingMonths))}
                />
                <SummaryMetric
                  label="Latest Month Qty"
                  value={number(latestOverall?.quantity ?? 0)}
                  detail={latestOverall?.month}
                />
                <SummaryMetric
                  label="Active Members"
                  value={number(latestOverall?.activeMembers ?? 0)}
                />
                <SummaryMetric
                  label="Top Member"
                  value={analytics.kpis.topMember ?? "N/A"}
                />
                <SummaryMetric label="Top SKU" value={analytics.kpis.topSku ?? "N/A"} />
              </div>
            </CardContent>
          </Card>

          <RollingChartCard
            title={chartTitle(analytics)}
            data={memberData}
            mode={memberChartMode}
            onModeChange={setMemberChartMode}
            emptyState="Select a member to view its rolling 12-month trend."
          />

          <RollingChartCard
            title="Midstate Overall Rolling 12 Months"
            data={analytics.overallRollingMonths}
            mode={overallChartMode}
            onModeChange={setOverallChartMode}
            emptyState="No Midstate rolling data yet."
          />

          {analytics.selectedMember ? (
            <Card>
              <CardHeader>
                <CardTitle>Selected Member Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <SummaryMetric
                  label="Member"
                  value={analytics.selectedMember.memberName}
                  detail={analytics.selectedMember.memberNumber}
                />
                <SummaryMetric
                  label="Rolling 12 Qty"
                  value={number(totalQuantity(analytics.rollingMonths))}
                />
                <SummaryMetric
                  label="Latest Month Qty"
                  value={number(latestMember?.quantity ?? 0)}
                  detail={latestMember?.month}
                />
              </CardContent>
            </Card>
          ) : null}

          <RollingDetailsCard
            activeTab={detailTab}
            category={itemCategory}
            analytics={analytics}
            onCategoryChange={setItemCategory}
            onTabChange={setDetailTab}
          />

          <div className="flex justify-start">
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
        </>
      ) : null}
    </div>
  );
}
