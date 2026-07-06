"use client";

import { FolderPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProjectFormProps = {
  onCreated: () => void;
};

const priorities = ["low", "medium", "high", "urgent"] as const;
const statuses = ["active", "paused", "completed", "archived"] as const;

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function ProjectForm({ onCreated }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]>(
    "medium",
  );
  const [status, setStatus] = useState<(typeof statuses)[number]>("active");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          ...(companyName.trim() ? { companyName: companyName.trim() } : {}),
          ...(description.trim()
            ? { description: description.trim() }
            : {}),
          priority,
          status,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create project.");
      }

      setName("");
      setCompanyName("");
      setDescription("");
      setPriority("medium");
      setStatus("active");
      onCreated();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to create project.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Project</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Project name
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Customer workspace"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Company name
              <Input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Description
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional notes about the project"
              className="min-h-20"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Priority
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as typeof priority)
                }
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
              >
                {priorities.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as typeof status)
                }
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
              >
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={isSaving || name.trim().length === 0}>
            <FolderPlus className="size-4" aria-hidden="true" />
            {isSaving ? "Creating" : "Create Project"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
