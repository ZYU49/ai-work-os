"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, Loader2, Send } from "lucide-react";
import { MessageList, type AgentChatMessage } from "./message-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

type AgentScope = "all" | "project" | "today";

type ChatPanelProps = {
  compact?: boolean;
  initialScope?: AgentScope;
  initialProjectRef?: string;
  initialMessage?: string;
};

type AgentChatResponse = {
  conversation?: { id: string };
  messages?: {
    assistant?: {
      id: string;
      role: string;
      content: string;
      createdAt?: string;
    };
  };
  error?: string;
};

const scopeOptions: Array<{ value: AgentScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "project", label: "Project" },
];

function localMessage(role: AgentChatMessage["role"], content: string) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function ChatPanel({
  compact = false,
  initialScope = "all",
  initialProjectRef = "",
  initialMessage = "",
}: ChatPanelProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [message, setMessage] = useState(initialMessage);
  const [scope, setScope] = useState<AgentScope>(initialScope);
  const [projectRef, setProjectRef] = useState(initialProjectRef);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(
    () => message.trim().length > 0 && !isLoading,
    [isLoading, message],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = message.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage = localMessage("user", trimmed);
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId ?? undefined,
          message: trimmed,
          scope,
          projectId: scope === "project" ? projectRef.trim() || undefined : undefined,
        }),
      });
      const data = (await response.json()) as AgentChatResponse;

      if (!response.ok) {
        throw new Error(data.error || "Agent chat is unavailable.");
      }

      if (data.conversation?.id) {
        setConversationId(data.conversation.id);
      }

      const assistant = data.messages?.assistant;
      if (assistant?.content) {
        setMessages((current) => [
          ...current,
          {
            id: assistant.id,
            role: "assistant",
            content: assistant.content,
            createdAt: assistant.createdAt,
          },
        ]);
      }
    } catch (chatError) {
      const errorMessage =
        chatError instanceof Error
          ? chatError.message
          : "Agent chat is unavailable.";
      setError(errorMessage);
      setMessages((current) => [
        ...current,
        localMessage(
          "assistant",
          `I could not complete that request: ${errorMessage}`,
        ),
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className={cn("flex flex-col", compact ? "min-h-96" : "min-h-[680px]")}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Agent Chat</CardTitle>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Read-only workspace guidance with draft actions only.
          </p>
        </div>
        {compact ? (
          <Link
            href="/agent"
            className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Open
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            Scope
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as AgentScope)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
            >
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {scope === "project" ? (
            <label className="grid gap-1 text-xs font-medium text-zinc-600">
              Project name or ID
              <Input
                value={projectRef}
                onChange={(event) => setProjectRef(event.target.value)}
                placeholder="Acme rollout or project ID"
              />
            </label>
          ) : null}
        </div>

        <MessageList messages={messages} isLoading={isLoading} />

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-auto grid gap-3">
          <label className="sr-only" htmlFor="agent-message">
            Message
          </label>
          <Textarea
            id="agent-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask what needs attention, summarize a project, or draft a next action..."
            className={compact ? "min-h-20" : "min-h-28"}
            disabled={isLoading}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!canSend}>
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
