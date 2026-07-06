import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
            Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            A focused workspace for current projects, tasks, notes, and agent
            activity.
          </p>
        </div>
        <Badge tone="neutral">Setup in progress</Badge>
      </div>

      <EmptyState
        title="Dashboard workspace is ready"
        description="Task 5 will add the full dashboard widgets. For now, this page keeps the app route usable without introducing placeholder metrics."
      />
    </div>
  );
}
