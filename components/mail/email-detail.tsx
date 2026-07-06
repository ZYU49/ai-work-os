"use client";

import { Brain, CalendarClock, MailOpen, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MailEmail } from "./email-list";

type EmailDetailProps = {
  email: MailEmail | null;
  isAnalyzing: boolean;
  onAnalyze: (id: string) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function EmailDetail({
  email,
  isAnalyzing,
  onAnalyze,
}: EmailDetailProps) {
  if (!email) {
    return (
      <Card>
        <CardContent>
          <div className="flex min-h-80 flex-col items-center justify-center text-center text-sm text-zinc-500">
            <MailOpen className="mb-3 size-6 text-zinc-400" aria-hidden="true" />
            Select a pasted email to review the body and run analysis.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{email.subject}</CardTitle>
            <p className="mt-1 truncate text-sm text-zinc-500">{email.from}</p>
          </div>
          <Badge tone={email.status === "analyzed" ? "green" : "neutral"}>
            {email.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {formatDate(email.sentAt)}
          </span>
          {email.project ? <span>{email.project.name}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm text-zinc-600">
          <p>
            <span className="font-medium text-zinc-950">To:</span>{" "}
            {email.to.join(", ") || "(none)"}
          </p>
          {email.cc.length > 0 ? (
            <p>
              <span className="font-medium text-zinc-950">Cc:</span>{" "}
              {email.cc.join(", ")}
            </p>
          ) : null}
        </div>
        <div className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800">
          {email.body || "(empty)"}
        </div>
        <Button onClick={() => onAnalyze(email.id)} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Brain className="size-4" aria-hidden="true" />
          )}
          {isAnalyzing ? "Analyzing" : "Analyze"}
        </Button>
      </CardContent>
    </Card>
  );
}
