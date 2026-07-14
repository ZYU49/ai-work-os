"use client";

import { BookOpen, Save } from "lucide-react";
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

type KnowledgeEditorProps = {
  onSaved: () => void;
};

const categories = [
  "general",
  "customer",
  "product",
  "process",
  "file_reference",
] as const;

function label(value: string) {
  return value.replaceAll("_", " ");
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function KnowledgeEditor({ onSaved }: KnowledgeEditorProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<(typeof categories)[number]>("general");
  const [projectId, setProjectId] = useState("");
  const [tags, setTags] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
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
      setError("Add a title and knowledge content.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          content: content.trim(),
          tags: parseTags(tags),
          ...(summary.trim() ? { summary: summary.trim() } : {}),
          ...(projectId ? { projectId } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save knowledge page.");
      }

      setTitle("");
      setCategory("general");
      setProjectId("");
      setTags("");
      setSummary("");
      setContent("");
      onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save knowledge page.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Knowledge Page</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            aria-label="Knowledge title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              aria-label="Knowledge category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as typeof category)
              }
              className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm capitalize text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
            >
              {categories.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>

            <select
              aria-label="Knowledge project"
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

          <Input
            aria-label="Knowledge tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags, separated by commas"
          />

          <Input
            aria-label="Knowledge summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Short summary"
          />

          <Textarea
            aria-label="Knowledge content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write the rule, process, customer note, or product context"
            className="min-h-64"
          />

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              <Save className="size-4" aria-hidden="true" />
              {isSaving ? "Saving" : "Save Page"}
            </Button>
            <Button variant="secondary" disabled title="File summary is coming later">
              <BookOpen className="size-4" aria-hidden="true" />
              Summarize file
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
