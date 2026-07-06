import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OpenFollowUp } from "@/services/dashboard";

type FollowUpsProps = {
  followUps: OpenFollowUp[];
};

const priorityTone = {
  low: "neutral",
  medium: "blue",
  high: "yellow",
  urgent: "red",
} as const;

function formatDueDate(value: Date | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(value);
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function FollowUps({ followUps }: FollowUpsProps) {
  return (
    <Card className="min-h-80">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Follow Up</CardTitle>
        <Badge tone={followUps.length > 0 ? "yellow" : "neutral"}>
          {followUps.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {followUps.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <Bell className="size-7 text-zinc-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-zinc-950">
              No open follow-ups
            </p>
            <p className="mt-1 max-w-xs text-sm leading-6 text-zinc-500">
              Open follow-ups will be prioritized here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {followUps.map((followUp) => (
              <div key={followUp.id} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950">
                      {followUp.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {followUp.project ? (
                        <Link
                          href={`/projects/${followUp.project.id}`}
                          className="hover:text-zinc-950 hover:underline"
                        >
                          {followUp.project.name}
                        </Link>
                      ) : followUp.contact ? (
                        followUp.contact.name
                      ) : (
                        "Unassigned"
                      )}
                      {" - Due "}
                      {formatDueDate(followUp.dueDate)}
                    </p>
                  </div>
                  <Badge tone={priorityTone[followUp.priority]}>
                    {label(followUp.priority)}
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
