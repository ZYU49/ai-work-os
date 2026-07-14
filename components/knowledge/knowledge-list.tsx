"use client";

import { AlertCircle, BookOpen, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

type KnowledgePageItem = {
  id: string;
  projectId: string | null;
  title: string;
  category: "general" | "customer" | "product" | "process" | "file_reference";
  content: string;
  tags: string[];
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
};

type KnowledgeResponse = {
  pages?: KnowledgePageItem[];
  error?: string;
};

type KnowledgeListProps = {
  refreshKey?: number;
};

const categories = [
  "",
  "general",
  "customer",
  "product",
  "process",
  "file_reference",
] as const;

function label(value: string) {
  return value ? value.replaceAll("_", " ") : "all categories";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function excerpt(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= 260) {
    return normalized;
  }

  return `${normalized.slice(0, 259)}...`;
}

export function KnowledgeList({ refreshKey = 0 }: KnowledgeListProps) {
  const [pages, setPages] = useState<KnowledgePageItem[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (category) {
      params.set("category", category);
    }

    if (tag.trim()) {
      params.set("tag", tag.trim());
    }

    return params.toString();
  }, [category, query, tag]);

  const fetchPages = useCallback(async (activeFilters = filters) => {
    const path = activeFilters
      ? `/api/knowledge?${activeFilters}`
      : "/api/knowledge";
    const response = await fetch(path, { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as KnowledgeResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load knowledge pages.");
    }

    return data.pages ?? [];
  }, [filters]);

  async function loadPages(activeFilters = filters) {
    setIsLoading(true);
    setError(null);

    try {
      setPages(await fetchPages(activeFilters));
    } catch (loadError) {
      setPages([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load knowledge pages.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialPages() {
      setIsLoading(true);
      setError(null);

      try {
        const initialPages = await fetchPages(filters);

        if (isMounted) {
          setPages(initialPages);
        }
      } catch (loadError) {
        if (isMounted) {
          setPages([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load knowledge pages.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialPages();

    return () => {
      isMounted = false;
    };
  }, [fetchPages, filters, refreshKey]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search knowledge"
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm capitalize text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
          >
            {categories.map((value) => (
              <option key={value || "all"} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
          <Input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="Tag"
          />
          <Button variant="secondary" onClick={() => loadPages()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Card className="flex h-52 items-center justify-center gap-2 text-sm text-zinc-500">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          Loading knowledge
        </Card>
      ) : error ? (
        <EmptyState
          title="Knowledge is unavailable"
          description={error}
          icon={<AlertCircle className="size-6" aria-hidden="true" />}
          action={{ label: "Retry", onClick: () => loadPages() }}
        />
      ) : pages.length === 0 ? (
        <EmptyState
          title="No knowledge pages found"
          description="Create a page or adjust the filters to see saved context."
          icon={<BookOpen className="size-6" aria-hidden="true" />}
        />
      ) : (
        <div className="grid gap-3">
          {pages.map((page) => (
            <Card key={page.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-zinc-950">
                    {page.title}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {page.project?.name ?? "No project"} -{" "}
                    {formatDate(page.updatedAt)}
                  </p>
                </div>
                <Badge tone="blue">{label(page.category)}</Badge>
              </div>

              {page.summary ? (
                <p className="mt-3 text-sm font-medium leading-6 text-zinc-800">
                  {page.summary}
                </p>
              ) : null}

              <p className="mt-2 text-sm leading-6 text-zinc-700">
                {excerpt(page.content)}
              </p>

              {page.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {page.tags.map((tagValue) => (
                    <Badge key={tagValue} tone="neutral">
                      {tagValue}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
