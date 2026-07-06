"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProjectOverviewProps = {
  project: {
    name: string;
    companyName: string | null;
    description: string | null;
    status: string;
    priority: string;
    lastActivityAt: string | null;
    createdAt: string;
    updatedAt: string;
    contacts: unknown[];
    emails: unknown[];
    files: unknown[];
    notes: unknown[];
    tasks: { status: string }[];
    followUps: { status: string }[];
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const openTasks = project.tasks.filter(
    (task) => task.status !== "completed",
  ).length;
  const openFollowUps = project.followUps.filter(
    (followUp) => followUp.status !== "done",
  ).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">
              {project.name}
            </h2>
            {project.companyName ? (
              <p className="mt-1 text-sm font-medium text-zinc-500">
                {project.companyName}
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {project.description ?? "No project description has been added."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">{label(project.status)}</Badge>
            <Badge tone={project.priority === "urgent" ? "red" : "blue"}>
              {label(project.priority)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-zinc-500">Contacts</dt>
              <dd className="mt-1 font-semibold text-zinc-950">
                {project.contacts.length}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Emails</dt>
              <dd className="mt-1 font-semibold text-zinc-950">
                {project.emails.length}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Files</dt>
              <dd className="mt-1 font-semibold text-zinc-950">
                {project.files.length}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Notes</dt>
              <dd className="mt-1 font-semibold text-zinc-950">
                {project.notes.length}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Open tasks</dt>
              <dd className="mt-1 font-semibold text-zinc-950">{openTasks}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Open follow-ups</dt>
              <dd className="mt-1 font-semibold text-zinc-950">
                {openFollowUps}
              </dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-zinc-100 pt-4 text-xs leading-5 text-zinc-500">
            Last activity: {formatDate(project.lastActivityAt)}
            <br />
            Updated: {formatDate(project.updatedAt)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
