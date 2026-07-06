import { Bot, User } from "lucide-react";
import { cn } from "@/lib/cn";

export type AgentChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type MessageListProps = {
  messages: AgentChatMessage[];
  isLoading?: boolean;
};

export function MessageList({ messages, isLoading = false }: MessageListProps) {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 text-center text-sm leading-6 text-zinc-500">
        Ask about today, a project, due tasks, follow-ups, or recent mail.
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="flex min-h-48 flex-col gap-3 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-3"
    >
      {messages.map((message) => {
        const isAssistant = message.role === "assistant";
        const Icon = isAssistant ? Bot : User;

        return (
          <article
            key={message.id}
            className={cn(
              "flex gap-3 rounded-md border bg-white p-3",
              isAssistant ? "border-zinc-200" : "border-zinc-300",
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                isAssistant
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-700",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">
                {isAssistant ? "Agent" : "You"}
              </p>
              <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
                {message.content}
              </div>
            </div>
          </article>
        );
      })}
      {isLoading ? (
        <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500">
          Agent is reading workspace context...
        </div>
      ) : null}
    </div>
  );
}
