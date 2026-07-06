"use client";

import { AlertCircle, RefreshCw, Search, StickyNote } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

type NoteListItem = {
  id: string;
  projectId: string | null;
  type: "note" | "meeting" | "idea" | "phone_call";
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
};

type NotesResponse = {
  notes?: NoteListItem[];
  error?: string;
};

type NoteListProps = {
  refreshKey?: number;
};

const noteTypes = ["", "note", "meeting", "idea", "phone_call"] as const;

function label(value: string) {
  return value ? value.replaceAll("_", " ") : "all types";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function NoteList({ refreshKey = 0 }: NoteListProps) {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [projectId, setProjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (type) {
      params.set("type", type);
    }

    if (projectId.trim()) {
      params.set("projectId", projectId.trim());
    }

    return params.toString();
  }, [projectId, query, type]);

  const fetchNotes = useCallback(async (activeFilters = filters) => {
    const path = activeFilters ? `/api/notes?${activeFilters}` : "/api/notes";
    const response = await fetch(path, { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as NotesResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load notes.");
    }

    return data.notes ?? [];
  }, [filters]);

  async function loadNotes(activeFilters = filters) {
    setIsLoading(true);
    setError(null);

    try {
      setNotes(await fetchNotes(activeFilters));
    } catch (loadError) {
      setNotes([]);
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load notes.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialNotes() {
      setIsLoading(true);
      setError(null);

      try {
        const initialNotes = await fetchNotes(filters);

        if (isMounted) {
          setNotes(initialNotes);
        }
      } catch (loadError) {
        if (isMounted) {
          setNotes([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load notes.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialNotes();

    return () => {
      isMounted = false;
    };
  }, [fetchNotes, filters, refreshKey]);

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
              placeholder="Search notes"
              className="pl-9"
            />
          </div>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm capitalize text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
          >
            {noteTypes.map((value) => (
              <option key={value || "all"} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
          <Input
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Project ID"
          />
          <Button variant="secondary" onClick={() => loadNotes()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Card className="flex h-52 items-center justify-center gap-2 text-sm text-zinc-500">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          Loading notes
        </Card>
      ) : error ? (
        <EmptyState
          title="Notes are unavailable"
          description={error}
          icon={<AlertCircle className="size-6" aria-hidden="true" />}
          action={{ label: "Retry", onClick: () => loadNotes() }}
        />
      ) : notes.length === 0 ? (
        <EmptyState
          title="No notes found"
          description="Save a note or adjust the filters to see captured context."
          icon={<StickyNote className="size-6" aria-hidden="true" />}
        />
      ) : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <Card key={note.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-zinc-950">
                    {note.title ?? "Untitled note"}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {note.project?.name ?? note.projectId ?? "No project"} ·{" "}
                    {formatDate(note.updatedAt)}
                  </p>
                </div>
                <Badge tone="blue">{label(note.type)}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {note.content}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
