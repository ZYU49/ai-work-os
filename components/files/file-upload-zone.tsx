"use client";

import { UploadCloud } from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from "react";
import { ProjectSelect } from "@/components/projects/project-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

type FileUploadZoneProps = {
  onUploaded: () => void;
};

const categories = [
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
  return value.replaceAll("_", " ");
}

export function FileUploadZone({ onUploaded }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("other");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseFile(file: File | undefined) {
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("category", category);

      if (projectId.trim()) {
        formData.append("projectId", projectId.trim());
      }

      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      if (tags.trim()) {
        formData.append("tags", tags.trim());
      }

      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to upload file.");
      }

      setSelectedFile(null);
      setProjectId("");
      setCategory("other");
      setNotes("");
      setTags("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      onUploaded();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload file.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload File</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
              isDragging
                ? "border-zinc-500 bg-zinc-100"
                : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100",
            )}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                inputRef.current?.click();
              }
            }}
          >
            <UploadCloud className="size-8 text-zinc-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-zinc-950">
              {selectedFile ? selectedFile.name : "Drop a file or browse"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {selectedFile
                ? `${Math.max(selectedFile.size / 1024, 0.1).toFixed(1)} KB`
                : "One file per upload"}
            </p>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              onChange={handleFileInput}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ProjectSelect value={projectId} onChange={setProjectId} />
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Category
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as typeof category)
                }
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
              >
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags, comma-separated"
          />
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
            className="min-h-24"
          />

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isUploading || !selectedFile}>
            <UploadCloud className="size-4" aria-hidden="true" />
            {isUploading ? "Uploading" : "Upload"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
