"use client";

import { AlertCircle, Check, RefreshCw, Search, CheckSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

type TaskListItem = {
  id: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "waiting_reply" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
};

type ProjectOption = {
  id: string;
  name: string;
  companyName: string | null;
};

type TasksResponse = {
  tasks?: TaskListItem[];
  error?: string;
};

type ProjectsResponse = {
  projects?: ProjectOption[];
};

type TaskTableProps = {
  refreshKey?: number;
};

const statuses = ["", "not_started", "in_progress", "waiting_reply", "completed"] as const;
const priorities = ["", "low", "medium", "high", "urgent"] as const;

function label(value: string) {
  return value ? value.replaceAll("_", " ") : "all";
}

function statusTone(status: TaskListItem["status"]) {
  if (status === "completed") {
    return "green" as const;
  }

  if (status === "waiting_reply") {
    return "yellow" as const;
  }

  if (status === "in_progress") {
    return "blue" as const;
  }

  return "neutral" as const;
}

function priorityTone(priority: TaskListItem["priority"]) {
  if (priority === "urgent") {
    return "red" as const;
  }

  if (priority === "high") {
    return "yellow" as const;
  }

  return "neutral" as const;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat(undefined, {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function TaskTable({ refreshKey = 0 }: TaskTableProps) {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const filters = useMemo(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (status) {
      params.set("status", status);
    }

    if (priority) {
      params.set("priority", priority);
    }

    if (projectId) {
      params.set("projectId", projectId);
    }

    return params.toString();
  }, [priority, projectId, query, status]);

  const fetchTasks = useCallback(async (activeFilters = filters) => {
    const path = activeFilters ? `/api/tasks?${activeFilters}` : "/api/tasks";
    const response = await fetch(path, { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as TasksResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load tasks.");
    }

    return data.tasks ?? [];
  }, [filters]);

  async function loadTasks(activeFilters = filters) {
    setIsLoading(true);
    setError(null);

    try {
      setTasks(await fetchTasks(activeFilters));
    } catch (loadError) {
      setTasks([]);
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load tasks.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function complete(id: string) {
    setCompletingId(id);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "complete" }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to complete task.");
      }

      await loadTasks();
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : "Unable to complete task.",
      );
    } finally {
      setCompletingId(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as ProjectsResponse;

        if (response.ok && isMounted) {
          setProjects(data.projects ?? []);
        }
      } catch {
        if (isMounted) {
          setProjects([]);
        }
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialTasks() {
      setIsLoading(true);
      setError(null);

      try {
        const initialTasks = await fetchTasks(filters);

        if (isMounted) {
          setTasks(initialTasks);
        }
      } catch (loadError) {
        if (isMounted) {
          setTasks([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load tasks.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialTasks();

    return () => {
      isMounted = false;
    };
  }, [fetchTasks, filters, refreshKey]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <Input
              aria-label="Search tasks"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks"
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filter tasks by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm capitalize text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
          >
            {statuses.map((value) => (
              <option key={value || "all-status"} value={value}>
                {value ? label(value) : "all statuses"}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter tasks by priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm capitalize text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
          >
            {priorities.map((value) => (
              <option key={value || "all-priority"} value={value}>
                {value ? label(value) : "all priorities"}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter tasks by project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => loadTasks()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Card className="flex h-52 items-center justify-center gap-2 text-sm text-zinc-500">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          Loading tasks
        </Card>
      ) : error ? (
        <EmptyState
          title="Tasks are unavailable"
          description={error}
          icon={<AlertCircle className="size-6" aria-hidden="true" />}
          action={{ label: "Retry", onClick: () => loadTasks() }}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Create a task or adjust the filters to see your work queue."
          icon={<CheckSquare className="size-6" aria-hidden="true" />}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-normal text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="bg-white hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-950">{task.title}</div>
                      {task.description ? (
                        <p className="mt-1 max-w-md truncate text-xs text-zinc-500">
                          {task.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {task.project?.name ?? task.projectId ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(task.status)}>{label(task.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={priorityTone(task.priority)}>
                        {label(task.priority)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatDate(task.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        disabled={
                          task.status === "completed" || completingId === task.id
                        }
                        onClick={() => complete(task.id)}
                      >
                        <Check className="size-4" aria-hidden="true" />
                        {task.status === "completed" ? "Done" : "Complete"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
