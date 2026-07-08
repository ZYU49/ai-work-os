"use client";

import {
  AlertCircle,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

type FileMetadata = {
  originalName?: string;
  storagePath?: string;
  notes?: string;
  tags?: string[];
  status?: string;
};

type FileListItem = {
  id: string;
  projectId: string | null;
  filename: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  category:
    | "quote"
    | "product_info"
    | "meeting_record"
    | "customer_requirement"
    | "trade_show"
    | "logistics"
    | "edi"
    | "contract"
    | "image"
    | "other";
  summary: string | null;
  metadata: FileMetadata | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
};

type FilesResponse = {
  files?: FileListItem[];
  error?: string;
};

type FileListProps = {
  refreshKey?: number;
};

const categories = [
  "",
  "quote",
  "product_info",
  "meeting_record",
  "customer_requirement",
  "trade_show",
  "logistics",
  "edi",
  "contract",
  "image",
  "other",
] as const;

function label(value: string) {
  return value ? value.replaceAll("_", " ") : "all categories";
}

function formatBytes(value: number | null) {
  if (value === null) {
    return "Unknown size";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function metadata(value: FileListItem["metadata"]): FileMetadata {
  return value && typeof value === "object" ? value : {};
}

function fileDownloadHref(file: FileListItem) {
  return `/api/files/${file.id}/download`;
}

export function FileList({ refreshKey = 0 }: FileListProps) {
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [category, setCategory] = useState("");
  const [projectId, setProjectId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const filters = useMemo(() => {
    const params = new URLSearchParams();

    if (category) {
      params.set("category", category);
    }

    if (projectId.trim()) {
      params.set("projectId", projectId.trim());
    }

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (status.trim()) {
      params.set("status", status.trim());
    }

    return params.toString();
  }, [category, projectId, query, status]);

  const fetchFiles = useCallback(async (activeFilters = filters) => {
    const path = activeFilters ? `/api/files?${activeFilters}` : "/api/files";
    const response = await fetch(path, { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as FilesResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load files.");
    }

    return data.files ?? [];
  }, [filters]);

  async function loadFiles(activeFilters = filters) {
    setIsLoading(true);
    setError(null);

    try {
      setFiles(await fetchFiles(activeFilters));
    } catch (loadError) {
      setFiles([]);
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load files.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialFiles() {
      setIsLoading(true);
      setError(null);

      try {
        const initialFiles = await fetchFiles(filters);

        if (isMounted) {
          setFiles(initialFiles);
        }
      } catch (loadError) {
        if (isMounted) {
          setFiles([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load files.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialFiles();

    return () => {
      isMounted = false;
    };
  }, [fetchFiles, filters, refreshKey]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files"
              className="pl-9"
            />
          </div>
          <Input
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Project ID"
          />
          <Input
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            placeholder="Status"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
          >
            {categories.map((value) => (
              <option key={value || "all"} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => loadFiles()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Card className="flex h-52 items-center justify-center gap-2 text-sm text-zinc-500">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          Loading files
        </Card>
      ) : error ? (
        <EmptyState
          title="Files are unavailable"
          description={error}
          icon={<AlertCircle className="size-6" aria-hidden="true" />}
          action={{ label: "Retry", onClick: () => loadFiles() }}
        />
      ) : files.length === 0 ? (
        <EmptyState
          title="No files found"
          description="Upload a file or adjust the filters to see stored project assets."
          icon={<FileText className="size-6" aria-hidden="true" />}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-normal text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {files.map((file) => {
                  const details = metadata(file.metadata);
                  const tags = Array.isArray(details.tags) ? details.tags : [];

                  return (
                    <tr key={file.id} className="bg-white hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <a
                          href={fileDownloadHref(file)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-lg items-center gap-2 font-medium text-zinc-950 hover:underline"
                        >
                          {details.originalName ?? file.filename}
                          <ExternalLink
                            className="size-3.5 shrink-0 text-zinc-400"
                            aria-hidden="true"
                          />
                        </a>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                          <span>{file.mimeType ?? "Unknown type"}</span>
                          <span>{formatBytes(file.size)}</span>
                        </div>
                        {details.notes ? (
                          <p className="mt-1 max-w-lg truncate text-xs text-zinc-500">
                            {details.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="blue">{label(file.category)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {file.project?.name ?? file.projectId ?? "Unassigned"}
                      </td>
                      <td className="px-4 py-3">
                        {details.status ? (
                          <Badge tone="green">{details.status}</Badge>
                        ) : (
                          <span className="text-xs text-zinc-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tags.length > 0 ? (
                          <div className="flex max-w-64 flex-wrap gap-1">
                            {tags.map((tag) => (
                              <Badge key={tag}>{tag}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {formatDate(file.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
