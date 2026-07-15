"use client";

import { AlertCircle, PackageSearch, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

type MidstateItem = {
  itemNumber: string;
  description: string | null;
  size: string | null;
  brand: string | null;
  itemGroup: string | null;
  status: string | null;
  uom: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  fobCost: {
    sourceSheet: string;
    currentFob: number | null;
    increase: number | null;
    effectiveFob: number | null;
    effectiveDate: string;
    containerQty40: number | null;
    containerQty20: number | null;
  } | null;
};

type MidstateItemsResponse = {
  items?: MidstateItem[];
  itemGroups?: string[];
  total?: number;
  error?: string;
};

const pageSize = 100;

function number(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat().format(value);
}

export function MidstateItemMaster() {
  const [items, setItems] = useState<MidstateItem[]>([]);
  const [itemGroups, setItemGroups] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [itemGroup, setItemGroup] = useState("");
  const [hasFobCost, setHasFobCost] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (itemGroup) {
      params.set("itemGroup", itemGroup);
    }

    if (hasFobCost) {
      params.set("hasFobCost", "true");
    }

    return params.toString();
  }, [hasFobCost, itemGroup, query]);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const path = filters
        ? `/api/knowledge/midstate-items?${filters}`
        : "/api/knowledge/midstate-items";
      const response = await fetch(path, { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as MidstateItemsResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load Midstate item master.");
      }

      setItems(data.items ?? []);
      setItemGroups(data.itemGroups ?? []);
      setTotal(data.total ?? 0);
    } catch (loadError) {
      setItems([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Midstate item master.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialItems() {
      setIsLoading(true);
      setError(null);

      try {
        const path = filters
          ? `/api/knowledge/midstate-items?${filters}`
          : "/api/knowledge/midstate-items";
        const response = await fetch(path, { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as MidstateItemsResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load Midstate item master.");
        }

        if (isMounted) {
          setItems(data.items ?? []);
          setItemGroups(data.itemGroups ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (loadError) {
        if (isMounted) {
          setItems([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Midstate item master.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialItems();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Midstate Item Master</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">
            {total
              ? `${number(total)} items from Item_List (Cleaned).xlsx`
              : "Product lookup"}
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[260px_220px_auto_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search item or description"
              className="pl-9"
            />
          </div>
          <select
            value={itemGroup}
            onChange={(event) => {
              setItemGroup(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
            aria-label="Item master group"
          >
            <option value="">All Item Groups</option>
            {itemGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={loadItems}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm">
            <input
              type="checkbox"
              checked={hasFobCost}
              onChange={(event) => {
                setHasFobCost(event.target.checked);
                setPage(1);
              }}
              className="size-4 rounded border-zinc-300"
            />
            Has FOB cost
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-44 items-center justify-center gap-2 text-sm text-zinc-500">
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
            Loading item master
          </div>
        ) : error ? (
          <EmptyState
            title="Item master is unavailable"
            description={error}
            icon={<AlertCircle className="size-6" aria-hidden="true" />}
            action={{ label: "Retry", onClick: loadItems }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No items found"
            description="Try another item number, description, size, or item group."
            icon={<PackageSearch className="size-6" aria-hidden="true" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-normal text-zinc-500">
                  <th className="py-2 pr-4">Item Number</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Item Group</th>
                  <th className="px-4 py-2">UoM</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2 text-right">FOB Cost</th>
                  <th className="px-4 py-2">Cost Source</th>
                  <th className="px-4 py-2 text-right">Weight</th>
                  <th className="py-2 pl-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr
                    key={item.itemNumber}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="py-2 pr-4 font-medium text-zinc-950">
                      {item.itemNumber}
                    </td>
                    <td className="max-w-[520px] whitespace-normal px-4 py-2 leading-5 text-zinc-700">
                      {item.description ?? "N/A"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {item.itemGroup ?? "N/A"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {item.uom ?? "N/A"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {item.size ?? "N/A"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-600">
                      {item.fobCost?.effectiveFob === null ||
                      item.fobCost?.effectiveFob === undefined
                        ? "N/A"
                        : `$${number(item.fobCost.effectiveFob)}`}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {item.fobCost
                        ? `${item.fobCost.sourceSheet} (${item.fobCost.effectiveDate})`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-600">
                      {number(item.weight)}
                    </td>
                    <td className="py-2 pl-4 text-zinc-600">
                      {item.status ?? "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-500">
                Showing {number(startIndex + 1)}-{number(endIndex)} of{" "}
                {number(items.length)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="min-w-20 text-center text-xs font-medium text-zinc-500">
                  Page {number(currentPage)} / {number(totalPages)}
                </span>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
