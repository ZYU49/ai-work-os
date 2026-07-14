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
};

type MidstateItemsResponse = {
  items?: MidstateItem[];
  itemGroups?: string[];
  total?: number;
  error?: string;
};

function number(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat().format(value);
}

function dimensions(item: MidstateItem) {
  const values = [item.length, item.width, item.height];

  if (
    values.every((value) => value === null) ||
    values.every((value) => value === null || value === 0)
  ) {
    return "N/A";
  }

  return `${number(item.length)} x ${number(item.width)} x ${number(item.height)}`;
}

export function MidstateItemMaster() {
  const [items, setItems] = useState<MidstateItem[]>([]);
  const [itemGroups, setItemGroups] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [itemGroup, setItemGroup] = useState("");
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

    return params.toString();
  }, [itemGroup, query]);

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
            {total ? `${number(total)} items from Item_List (15).xlsx` : "Product lookup"}
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[260px_220px_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search item or description"
              className="pl-9"
            />
          </div>
          <select
            value={itemGroup}
            onChange={(event) => setItemGroup(event.target.value)}
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
                  <th className="px-4 py-2">Dimensions</th>
                  <th className="px-4 py-2 text-right">Weight</th>
                  <th className="py-2 pl-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 150).map((item) => (
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
                    <td className="px-4 py-2 text-zinc-600">
                      {dimensions(item)}
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
            {items.length > 150 ? (
              <p className="mt-3 text-xs text-zinc-500">
                Showing first 150 matches. Use search or item group filter to narrow
                the list.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
