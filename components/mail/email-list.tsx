"use client";

import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { EmailAnalysis, type ParsedEmailAnalysis } from "./email-analysis";
import { EmailDetail } from "./email-detail";
import { PasteEmailForm } from "./paste-email-form";

export type MailEmail = {
  id: string;
  projectId: string | null;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string | null;
  status: "new" | "analyzed" | "replied" | "archived";
  sentAt: string;
  createdAt: string;
  project: { id: string; name: string } | null;
  analysis: {
    id: string;
    summary: string | null;
    metadata: ParsedEmailAnalysis | null;
  } | null;
};

type MailResponse = {
  emails?: MailEmail[];
  error?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getStoredAnalysis(email: MailEmail | null): ParsedEmailAnalysis | null {
  const metadata = email?.analysis?.metadata;

  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  return metadata;
}

export function EmailList() {
  const [emails, setEmails] = useState<MailEmail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const selectedEmail = useMemo(
    () => emails.find((email) => email.id === selectedId) ?? emails[0] ?? null,
    [emails, selectedId],
  );

  async function fetchEmails() {
    const response = await fetch("/api/mail", { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as MailResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load mail.");
    }

    return data.emails ?? [];
  }

  async function loadEmails() {
    setIsLoading(true);
    setError(null);

    try {
      const nextEmails = await fetchEmails();
      setEmails(nextEmails);
      setSelectedId((current) => current ?? nextEmails[0]?.id ?? null);
    } catch (loadError) {
      setEmails([]);
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load mail.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function analyzeEmail(id: string) {
    setAnalyzingId(id);
    setAnalysisError(null);

    try {
      const response = await fetch(`/api/mail/${id}/analyze`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        analysis?: ParsedEmailAnalysis;
        email?: MailEmail;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to analyze email.");
      }

      setEmails((current) =>
        current.map((email) => (email.id === id && data.email ? data.email : email)),
      );
    } catch (analyzeError) {
      setAnalysisError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "Unable to analyze email.",
      );
    } finally {
      setAnalyzingId(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialEmails() {
      try {
        const initialEmails = await fetchEmails();

        if (isMounted) {
          setEmails(initialEmails);
          setSelectedId(initialEmails[0]?.id ?? null);
        }
      } catch (loadError) {
        if (isMounted) {
          setEmails([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load mail.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialEmails();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <PasteEmailForm onCreated={loadEmails} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Recent Mail</CardTitle>
            <Button variant="ghost" onClick={loadEmails} disabled={isLoading}>
              <RefreshCw
                className={cn("size-4", isLoading && "animate-spin")}
                aria-hidden="true"
              />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-48 items-center justify-center gap-2 text-sm text-zinc-500">
                <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                Loading mail
              </div>
            ) : error ? (
              <EmptyState
                title="Mail is unavailable"
                description={error}
                icon={<AlertCircle className="size-6" aria-hidden="true" />}
                action={{ label: "Retry", onClick: loadEmails }}
                className="rounded-none border-0"
              />
            ) : emails.length === 0 ? (
              <EmptyState
                title="No pasted mail"
                description="Paste an email to start tracking and analyzing customer work."
                icon={<Inbox className="size-6" aria-hidden="true" />}
                className="rounded-none border-0"
              />
            ) : (
              <div className="divide-y divide-zinc-100">
                {emails.map((email) => (
                  <button
                    key={email.id}
                    type="button"
                    onClick={() => setSelectedId(email.id)}
                    className={cn(
                      "block w-full px-4 py-3 text-left transition-colors hover:bg-zinc-50",
                      selectedEmail?.id === email.id && "bg-zinc-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium text-zinc-950">
                        {email.subject}
                      </p>
                      <Badge tone={email.status === "analyzed" ? "green" : "neutral"}>
                        {email.status}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {email.from}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {formatDate(email.sentAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <EmailDetail
        email={selectedEmail}
        isAnalyzing={analyzingId === selectedEmail?.id}
        onAnalyze={analyzeEmail}
      />
      <div className="space-y-4">
        {analysisError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {analysisError}
          </p>
        ) : null}
        <EmailAnalysis analysis={getStoredAnalysis(selectedEmail)} />
      </div>
    </div>
  );
}
