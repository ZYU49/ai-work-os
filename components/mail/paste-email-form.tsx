"use client";

import { ClipboardPaste } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type PasteEmailFormProps = {
  onCreated: () => void;
};

export function PasteEmailForm({ onCreated }: PasteEmailFormProps) {
  const [raw, setRaw] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw,
          ...(projectId.trim() ? { projectId: projectId.trim() } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save pasted email.");
      }

      setRaw("");
      setProjectId("");
      onCreated();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save pasted email.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paste Email</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="From: Jane Smith <jane@example.com>&#10;To: Richard Yu <richard@example.com>&#10;Subject: PO update&#10;Date: July 6, 2026 9:00 AM&#10;&#10;Email body..."
            className="min-h-56"
            required
          />
          <Input
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Project ID"
          />
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={isSaving || raw.trim().length === 0}>
            <ClipboardPaste className="size-4" aria-hidden="true" />
            {isSaving ? "Saving" : "Save Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
