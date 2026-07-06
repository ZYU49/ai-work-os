import Link from "next/link";
import { Bot, ExternalLink, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardOverview } from "@/services/dashboard";

type AgentPanelProps = {
  overview: DashboardOverview;
};

export function AgentPanel({ overview }: AgentPanelProps) {
  const workload =
    overview.todayTasks.length +
    overview.todayEmails.length +
    overview.todayFiles.length +
    overview.openFollowUps.length;

  return (
    <Card className="min-h-80">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Agent Panel</CardTitle>
        <Link
          href="/agent"
          className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Open
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <Bot className="mt-0.5 size-5 text-zinc-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-zinc-950">
              Standing by for project work
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {workload > 0
                ? `${workload} fresh items are ready for review across tasks, mail, files, and follow-ups.`
                : "No fresh dashboard items need agent attention yet."}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white p-3">
          <Sparkles className="mt-0.5 size-5 text-zinc-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-zinc-950">
              AI Today Summary
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Today has {overview.todayActivities.length} recorded work events,
              {` ${overview.todayEmails.length}`} new mail items, and{" "}
              {overview.todayFiles.length} new files.
            </p>
          </div>
        </div>
        <Link
          href="/agent"
          className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <span className="truncate">Ask the Agent about today&apos;s work</span>
          <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
