"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  FileText,
  Inbox,
  Loader2,
  NotebookText,
  RefreshCw,
  Sparkles,
  SquareCheckBig,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

type ContextItem = {
  id: string;
  subject?: string;
  title?: string | null;
  filename?: string;
  action?: string;
  content?: string;
  status?: string;
  project?: { name?: string | null } | null;
};

type DailyLogResponse = {
  dateKey: string;
  context: {
    emails: ContextItem[];
    tasks: ContextItem[];
    files: ContextItem[];
    notes: ContextItem[];
    activities: ContextItem[];
  };
  log: { id: string; summary: string | null; updatedAt?: string } | null;
};

const sections = [
  { key: "emails", label: "Emails", icon: Inbox },
  { key: "tasks", label: "Tasks", icon: SquareCheckBig },
  { key: "files", label: "Files", icon: FileText },
  { key: "notes", label: "Notes", icon: NotebookText },
  { key: "activities", label: "Activity", icon: Activity },
] as const;

function chicagoDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function itemTitle(item: ContextItem) {
  return (
    item.subject ??
    item.title ??
    item.filename ??
    item.action ??
    item.content ??
    "Untitled"
  );
}

export default function DailyLogPage() {
  const [dateKey, setDateKey] = useState(() => {
    if (typeof window === "undefined") {
      return chicagoDateKey();
    }

    return new URLSearchParams(window.location.search).get("date") ?? chicagoDateKey();
  });
  const [data, setData] = useState<DailyLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalItems = useMemo(() => {
    if (!data) {
      return 0;
    }

    return sections.reduce(
      (count, section) => count + data.context[section.key].length,
      0,
    );
  }, [data]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDailyLog() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/daily-log?date=${dateKey}`, {
          signal: controller.signal,
        });
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error ?? "Unable to load daily log.");
        }

        setData(body);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load daily log.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadDailyLog();

    return () => controller.abort();
  }, [dateKey]);

  async function generateLog() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to generate daily log.");
      }

      setData(body);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Unable to generate daily log.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
            Daily Log
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Review the day&apos;s workspace activity and generate a concise
            report for handoff.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-sm font-medium text-zinc-700">
            <span className="mb-1 block">Date</span>
            <Input
              type="date"
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value)}
              className="w-full sm:w-44"
            />
          </label>
          <Button
            type="button"
            onClick={generateLog}
            disabled={isGenerating || isLoading}
            className="mt-auto"
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="size-4" aria-hidden="true" />
            )}
            Generate
          </Button>
        </div>
      </div>

      {error ? (
        <EmptyState
          title="Daily log unavailable"
          description={error}
          icon={<AlertCircle className="size-6" aria-hidden="true" />}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const items = data?.context[section.key] ?? [];

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
                    <div className="flex h-24 items-center justify-center text-sm text-zinc-500">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Loading
                    </div>
                  ) : items.length === 0 ? (
                    <p className="text-sm text-zinc-500">No records found.</p>
                  ) : (
                    <ul className="space-y-3">
                      {items.slice(0, 6).map((item) => (
                        <li key={item.id} className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-950">
                            {itemTitle(item)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {item.project?.name ?? item.status ?? "Workspace"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-zinc-500" aria-hidden="true" />
              Generated Report
            </CardTitle>
            {data?.log?.updatedAt ? (
              <RefreshCw className="size-4 text-zinc-400" aria-hidden="true" />
            ) : null}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-36 items-center justify-center text-sm text-zinc-500">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading report
              </div>
            ) : data?.log?.summary ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-zinc-700">
                  {data.log.summary}
                </p>
                <p className="text-xs text-zinc-500">
                  {totalItems} source records included for {data.dateKey}.
                </p>
              </div>
            ) : (
              <EmptyState
                title="No report generated"
                description="Generate a report after reviewing the selected day."
                icon={<Sparkles className="size-6" aria-hidden="true" />}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
