import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TodayTask } from "@/services/dashboard";

type TodayTasksProps = {
  tasks: TodayTask[];
};

const priorityTone = {
  low: "neutral",
  medium: "blue",
  high: "yellow",
  urgent: "red",
} as const;

function formatTime(value: Date | null) {
  if (!value) {
    return "Today";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function TodayTasks({ tasks }: TodayTasksProps) {
  return (
    <Card className="min-h-80">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Today Tasks</CardTitle>
        <Badge tone={tasks.length > 0 ? "blue" : "neutral"}>
          {tasks.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <CheckCircle2 className="size-7 text-zinc-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-zinc-950">
              No tasks due today
            </p>
            <p className="mt-1 max-w-xs text-sm leading-6 text-zinc-500">
              Tasks with today&apos;s due date will show here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {task.project ? (
                        <Link
                          href={`/projects/${task.project.id}`}
                          className="hover:text-zinc-950 hover:underline"
                        >
                          {task.project.name}
                        </Link>
                      ) : (
                        "No project"
                      )}
                      {" - "}
                      {formatTime(task.dueDate)}
                    </p>
                  </div>
                  <Badge tone={priorityTone[task.priority]}>
                    {label(task.priority)}
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
