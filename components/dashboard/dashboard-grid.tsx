import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  FileText,
  Inbox,
  Search,
  Sparkles,
} from "lucide-react";
import { AgentPanel } from "@/components/dashboard/agent-panel";
import { FollowUps } from "@/components/dashboard/follow-ups";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DashboardOverview,
  RecentFile,
  TodayActivity,
  TodayEmail,
  TodayFile,
} from "@/services/dashboard";

type DashboardGridProps = {
  overview: DashboardOverview;
};

function formatTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function metadataText(metadata: unknown, key: "title" | "description") {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function EmptyWidget({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center text-center">
      <div className="text-zinc-300">{icon}</div>
      <p className="mt-3 text-sm font-medium text-zinc-950">{title}</p>
      <p className="mt-1 max-w-xs text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function TodayMailCard({ emails }: { emails: TodayEmail[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Today New Mail</CardTitle>
        <Badge tone={emails.length > 0 ? "blue" : "neutral"}>
          {emails.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <EmptyWidget
            icon={<Inbox className="size-7" aria-hidden="true" />}
            title="No new mail today"
            description="Newly imported email will appear in this list."
          />
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div key={email.id} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                <p className="truncate text-sm font-medium text-zinc-950">
                  {email.subject}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {email.from}
                  {email.project ? (
                    <>
                      {" - "}
                      <Link
                        href={`/projects/${email.project.id}`}
                        className="hover:text-zinc-950 hover:underline"
                      >
                        {email.project.name}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TodayFilesCard({ files }: { files: TodayFile[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Today New Files</CardTitle>
        <Badge tone={files.length > 0 ? "green" : "neutral"}>
          {files.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <EmptyWidget
            icon={<FileText className="size-7" aria-hidden="true" />}
            title="No new files today"
            description="Uploaded or attached files will show up here."
          />
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                <p className="truncate text-sm font-medium text-zinc-950">
                  {file.filename}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {file.category.replaceAll("_", " ")}
                  {file.project ? ` - ${file.project.name}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentFilesCard({ files }: { files: RecentFile[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Recent Files</CardTitle>
        <Badge tone={files.length > 0 ? "green" : "neutral"}>
          {files.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <EmptyWidget
            icon={<FileText className="size-7" aria-hidden="true" />}
            title="No recent files"
            description="Recently updated files will appear here."
          />
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0"
              >
                <p className="truncate text-sm font-medium text-zinc-950">
                  {file.filename}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {file.category.replaceAll("_", " ")}
                  {file.project ? ` - ${file.project.name}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkRecordCard({ activities }: { activities: TodayActivity[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Today Work Record</CardTitle>
        <Badge tone={activities.length > 0 ? "green" : "neutral"}>
          {activities.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <EmptyWidget
            icon={<Activity className="size-7" aria-hidden="true" />}
            title="No work recorded today"
            description="Project changes and agent activity will be listed here."
          />
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const title =
                metadataText(activity.metadata, "title") ?? activity.action;
              const description = metadataText(
                activity.metadata,
                "description",
              );

              return (
                <div key={activity.id} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950">
                        {title}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {description ?? activity.project?.name ?? "Workspace"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {formatTime(activity.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AiSummaryCard({ overview }: DashboardGridProps) {
  const totalToday =
    overview.todayTasks.length +
    overview.todayEmails.length +
    overview.todayFiles.length +
    overview.todayActivities.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>AI Today Summary</CardTitle>
        <Sparkles className="size-4 text-zinc-400" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-zinc-600">
          {totalToday > 0
            ? `${totalToday} items landed on today's board. Start with urgent tasks and open follow-ups, then review new mail and files.`
            : "Today's board is quiet. New tasks, mail, files, and work records will shape this summary as they arrive."}
        </p>
      </CardContent>
    </Card>
  );
}

function QuickSearchCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Quick Search</CardTitle>
        <Search className="size-4 text-zinc-400" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="flex h-11 items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500">
          <Search className="size-4" aria-hidden="true" />
          <span className="truncate">Find projects, files, mail, and notes</span>
          <span className="ml-auto rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-400">
            /
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardGrid({ overview }: DashboardGridProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <TodayTasks tasks={overview.todayTasks} />
      </div>
      <AgentPanel overview={overview} />
      <TodayMailCard emails={overview.todayEmails} />
      <TodayFilesCard files={overview.todayFiles} />
      <RecentFilesCard files={overview.recentFiles} />
      <WorkRecordCard activities={overview.todayActivities} />
      <AiSummaryCard overview={overview} />
      <QuickSearchCard />
      <div className="lg:col-span-2">
        <RecentProjects projects={overview.recentProjects} />
      </div>
      <FollowUps followUps={overview.openFollowUps} />
    </div>
  );
}
