"use client";

import { CheckSquare, Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProjectOption = {
  id: string;
  name: string;
  companyName: string | null;
};

type ProjectsResponse = {
  projects?: ProjectOption[];
};

type TaskFormProps = {
  onCreated: () => void;
};

const statuses = ["not_started", "in_progress", "waiting_reply", "completed"] as const;
const priorities = ["low", "medium", "high", "urgent"] as const;

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function TaskForm({ onCreated }: TaskFormProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("not_started");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Add a task title.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          status,
          priority,
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(projectId ? { projectId } : {}),
          ...(dueDate ? { dueDate } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create task.");
      }

      setTitle("");
      setDescription("");
      setProjectId("");
      setStatus("not_started");
      setPriority("medium");
      setDueDate("");
      onCreated();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to create task.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            aria-label="Task title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
          />

          <select
            aria-label="Task project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.companyName
                  ? `${project.name} - ${project.companyName}`
                  : project.name}
              </option>
            ))}
          </select>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              aria-label="Task status"
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm capitalize text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>

            <select
              aria-label="Task priority"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as typeof priority)
              }
              className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm capitalize text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
            >
              {priorities.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </div>

          <Input
            aria-label="Task due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <Textarea
            aria-label="Task description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="min-h-24"
          />

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <CheckSquare className="size-4" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            {isSaving ? "Creating" : "Create Task"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
