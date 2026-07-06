"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpenText,
  CalendarDays,
  Contact,
  FileText,
  FolderKanban,
  Inbox,
  Loader2,
  Search,
  SquareCheckBig,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
  updatedAt?: string;
  createdAt?: string;
};

type SearchGroups = {
  projects: SearchResult[];
  emails: SearchResult[];
  files: SearchResult[];
  tasks: SearchResult[];
  notes: SearchResult[];
  dailyLogs: SearchResult[];
  contacts: SearchResult[];
};

const emptyGroups: SearchGroups = {
  projects: [],
  emails: [],
  files: [],
  tasks: [],
  notes: [],
  dailyLogs: [],
  contacts: [],
};

const sections = [
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "emails", label: "Emails", icon: Inbox },
  { key: "files", label: "Files", icon: FileText },
  { key: "tasks", label: "Tasks", icon: SquareCheckBig },
  { key: "notes", label: "Notes", icon: BookOpenText },
  { key: "dailyLogs", label: "Daily Logs", icon: CalendarDays },
  { key: "contacts", label: "Contacts", icon: Contact },
] as const;

function formatDate(value?: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function SearchPage() {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  const [results, setResults] = useState<SearchGroups>(emptyGroups);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        );
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error ?? "Unable to search workspace.");
        }

        setResults(body.results);
      } catch (searchError) {
        if (
          searchError instanceof DOMException &&
          searchError.name === "AbortError"
        ) {
          return;
        }

        setError(
          searchError instanceof Error
            ? searchError.message
            : "Unable to search workspace.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const totalResults = useMemo(
    () =>
      sections.reduce(
        (count, section) => count + results[section.key].length,
        0,
      ),
    [results],
  );
  const hasQuery = query.trim().length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Search
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Search across projects, mail, files, tasks, notes, daily logs, and
          contacts.
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);

            if (!nextQuery.trim()) {
              setResults(emptyGroups);
              setError(null);
              setIsLoading(false);
            }
          }}
          placeholder="Search workspace"
          className="h-11 pl-9"
          aria-label="Search workspace"
        />
      </div>

      {error ? (
        <EmptyState
          title="Search unavailable"
          description={error}
          icon={<AlertCircle className="size-6" aria-hidden="true" />}
        />
      ) : null}

      {!error && !hasQuery ? (
        <EmptyState
          title="Start with a keyword"
          description="Results will appear grouped by workspace area."
          icon={<Search className="size-6" aria-hidden="true" />}
        />
      ) : null}

      {!error && hasQuery && !isLoading && totalResults === 0 ? (
        <EmptyState
          title="No results found"
          description="Try a project, company, subject, filename, or contact name."
          icon={<Search className="size-6" aria-hidden="true" />}
        />
      ) : null}

      {hasQuery ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const items = results[section.key];

            return (
              <Card key={section.key}>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="size-4 text-zinc-500" aria-hidden="true" />
                    {section.label}
                  </CardTitle>
                  <span className="text-xs font-medium text-zinc-500">
                    {items.length}
                  </span>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex h-20 items-center justify-center text-sm text-zinc-500">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Searching
                    </div>
                  ) : items.length === 0 ? (
                    <p className="text-sm text-zinc-500">No matches.</p>
                  ) : (
                    <ul className="space-y-3">
                      {items.map((item) => (
                        <li key={`${item.type}-${item.id}`}>
                          <Link
                            href={item.href}
                            className="block rounded-md p-2 transition-colors hover:bg-zinc-50"
                          >
                            <p className="truncate text-sm font-medium text-zinc-950">
                              {item.title}
                            </p>
                            <div className="mt-1 flex min-w-0 items-center justify-between gap-3 text-xs text-zinc-500">
                              <span className="truncate">
                                {item.subtitle ?? item.type}
                              </span>
                              <span className="shrink-0">
                                {formatDate(item.updatedAt ?? item.createdAt)}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
