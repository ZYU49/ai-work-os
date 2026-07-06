"use client";

import { useState } from "react";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteList } from "@/components/notes/note-list";

export default function NotesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Notes
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Capture meeting notes, ideas, calls, and project context in one
          searchable workspace.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <NoteEditor onSaved={() => setRefreshKey((key) => key + 1)} />
        <NoteList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
