"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, FolderKanban, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

type ProjectListItem = {
  id: string;
  name: string;
  companyName: string | null;
  description: string | null;
  status: "active" | "paused" | "completed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  lastActivityAt: string | null;
  createdAt: string;
  openTaskCount: number;
  openFollowUpCount: number;
};

type ProjectsResponse = {
  projects?: ProjectListItem[];
  error?: string;
};

const priorityTone = {
  low: "neutral",
  medium: "blue",
  high: "yellow",
  urgent: "red",
} as const;

const statusTone = {
  active: "green",
  paused: "yellow",
  completed: "blue",
  archived: "neutral",
} as const;

function formatDate(value: string | null) {
  if (!value) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function ProjectList() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchProjects() {
    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = (await response.json()) as ProjectsResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load projects.");
    }

    return data.projects ?? [];
  }

  async function loadProjects() {
    setIsLoading(true);
    setError(null);

    try {
      setProjects(await fetchProjects());
    } catch (loadError) {
      setProjects([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load projects.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialProjects() {
      try {
        const initialProjects = await fetchProjects();

        if (isMounted) {
          setProjects(initialProjects);
        }
      } catch (loadError) {
        if (isMounted) {
          setProjects([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load projects.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex h-52 items-center justify-center gap-2 text-sm text-zinc-500">
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
            Loading projects
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Projects are unavailable"
        description={error}
        icon={<AlertCircle className="size-6" aria-hidden="true" />}
        action={{ label: "Retry", onClick: loadProjects }}
      />
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Create a project through the API to start tracking contacts, mail, files, tasks, notes, and follow-ups in one place."
        icon={<FolderKanban className="size-6" aria-hidden="true" />}
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-normal text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Last activity</th>
              <th className="px-4 py-3 font-medium">Open tasks</th>
              <th className="px-4 py-3 font-medium">Follow-ups</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {projects.map((project) => (
              <tr key={project.id} className="bg-white hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-zinc-950 hover:underline"
                  >
                    {project.name}
                  </Link>
                  {project.description ? (
                    <p className="mt-1 max-w-md truncate text-xs text-zinc-500">
                      {project.description}
                    </p>
                  ) : project.companyName ? (
                    <p className="mt-1 max-w-md truncate text-xs text-zinc-500">
                      {project.companyName}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[project.status]}>
                    {label(project.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={priorityTone[project.priority]}>
                    {label(project.priority)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatDate(project.lastActivityAt ?? project.createdAt)}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {project.openTaskCount}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {project.openFollowUpCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-zinc-100 px-4 py-3">
        <Button variant="secondary" onClick={loadProjects}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>
    </Card>
  );
}
