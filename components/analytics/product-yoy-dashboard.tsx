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

type ProductYoYAnalytics = {
  currentYear: number;
  priorYear: number;
  months: number[];
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

function percent(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function scopeLabel(analytics: ProductYoYAnalytics) {
  const months = analytics.months;

  if (!months.length) {
    return `Scope: ${analytics.currentYear} YTD`;
  }

  return `Scope: ${analytics.currentYear} YTD ${monthNames[months[0] - 1]}-${
    monthNames[months[months.length - 1] - 1]
  }`;
}

export function ProductYoYDashboard() {
  const [analytics, setAnalytics] = useState<ProductYoYAnalytics | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProductYoY() {
      setError(null);

      try {
        const response = await fetch("/api/analytics/product-yoy", {
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
  }, []);

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
              {analytics ? scopeLabel(analytics) : "Loading product YoY scope"}
            </p>
          </div>
          <div className="w-full sm:w-72">
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-100 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
                <tr>
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
                {rows.map((row) => (
                  <tr key={row.sku} className="hover:bg-zinc-50">
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
                    <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-950">
                      {percent(row.quantityGrowth)}
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
