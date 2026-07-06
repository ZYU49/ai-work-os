import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentProject } from "@/services/dashboard";

type RecentProjectsProps = {
  projects: RecentProject[];
};

const statusTone = {
  active: "green",
  paused: "yellow",
  completed: "blue",
  archived: "neutral",
} as const;

function formatDate(value: Date | null) {
  if (!value) {
    return "No activity";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(value);
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function RecentProjects({ projects }: RecentProjectsProps) {
  return (
    <Card className="min-h-80">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Recent Projects</CardTitle>
        <Badge tone="neutral">{projects.length}</Badge>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <FolderKanban className="size-7 text-zinc-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-zinc-950">
              No project activity yet
            </p>
            <p className="mt-1 max-w-xs text-sm leading-6 text-zinc-500">
              Projects will appear here after work is recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="truncate text-sm font-medium text-zinc-950 hover:underline"
                    >
                      {project.name}
                    </Link>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {project.companyName ?? "No company"} - Last activity{" "}
                      {formatDate(project.lastActivityAt ?? project.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {project.tasks.length} open tasks -{" "}
                      {project.followUps.length} follow-ups
                    </p>
                  </div>
                  <Badge tone={statusTone[project.status]}>
                    {label(project.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
