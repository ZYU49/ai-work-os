"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ParsedEmailAnalysis = {
  oneLineSummary: string;
  keyPoints: string[];
  people: string[];
  customers: string[];
  requiredActions: string[];
  needsReply: boolean;
  suggestedReply: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  suggestedProjectName: string | null;
  confidence: number;
};

type EmailAnalysisProps = {
  analysis: ParsedEmailAnalysis | null;
};

const priorityTone = {
  low: "neutral",
  medium: "blue",
  high: "yellow",
  urgent: "red",
} as const;

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
        {title}
      </h3>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-zinc-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function EmailAnalysis({ analysis }: EmailAnalysisProps) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-zinc-500">
            Select an email and run analysis to see summary, actions, priority,
            and reply guidance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>AI Analysis</CardTitle>
        <Badge tone={priorityTone[analysis.priority]}>{analysis.priority}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium leading-6 text-zinc-950">
          {analysis.oneLineSummary}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={analysis.needsReply ? "yellow" : "green"}>
            {analysis.needsReply ? "Reply needed" : "No reply needed"}
          </Badge>
          {analysis.dueDate ? <Badge tone="blue">Due {analysis.dueDate}</Badge> : null}
          {analysis.suggestedProjectName ? (
            <Badge tone="neutral">{analysis.suggestedProjectName}</Badge>
          ) : null}
        </div>
        <ListBlock title="Key Points" items={analysis.keyPoints} />
        <ListBlock title="Required Actions" items={analysis.requiredActions} />
        <ListBlock title="People" items={analysis.people} />
        <ListBlock title="Customers" items={analysis.customers} />
        {analysis.suggestedReply ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
              Suggested Reply
            </h3>
            <div className="mt-2 whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
              {analysis.suggestedReply}
            </div>
          </div>
        ) : null}
        <p className="text-xs text-zinc-500">
          Confidence {Math.round(analysis.confidence * 100)}%
        </p>
      </CardContent>
    </Card>
  );
}
