"use client";

import { useState } from "react";
import { KnowledgeEditor } from "@/components/knowledge/knowledge-editor";
import { KnowledgeList } from "@/components/knowledge/knowledge-list";

export default function KnowledgePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Knowledge
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Build a searchable wiki for customer rules, product notes, internal
          process, and file references.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <KnowledgeEditor onSaved={() => setRefreshKey((key) => key + 1)} />
        <KnowledgeList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
