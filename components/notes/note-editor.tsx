"use client";

import { Lightbulb, Save } from "lucide-react";
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
  error?: string;
};

type NoteEditorProps = {
  onSaved: () => void;
};

const noteTypes = ["note", "meeting", "idea", "phone_call"] as const;

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function NoteEditor({ onSaved }: NoteEditorProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<(typeof noteTypes)[number]>("note");
  const [projectId, setProjectId] = useState("");
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

    if (!title.trim() || !content.trim()) {
      setError("Add a title and note content.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          type,
          ...(projectId ? { projectId } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save note.");
      }

      setTitle("");
      setContent("");
      setType("note");
      setProjectId("");
      onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save note.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Note</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            aria-label="Note title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              aria-label="Note type"
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
              className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm capitalize text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
            >
              {noteTypes.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>

            <select
              aria-label="Note project"
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
          </div>

          <Textarea
            aria-label="Note content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Capture context, decisions, or next steps"
            className="min-h-48"
          />

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              <Save className="size-4" aria-hidden="true" />
              {isSaving ? "Saving" : "Save Note"}
            </Button>
            <Button variant="secondary" disabled title="AI organization is coming later">
              <Lightbulb className="size-4" aria-hidden="true" />
              AI organize
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
