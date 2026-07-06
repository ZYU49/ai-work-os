"use client";

import { useState } from "react";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskTable } from "@/components/tasks/task-table";

export default function TasksPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Tasks
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Track project work, filter priorities, and close the loop on active
          follow-through.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <TaskForm onCreated={() => setRefreshKey((key) => key + 1)} />
        <TaskTable refreshKey={refreshKey} />
      </div>
    </div>
  );
}
