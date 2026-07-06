import { ChatPanel } from "@/components/agent/chat-panel";

export default function AgentPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Agent
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Ask for concise guidance across your workspace. The MVP can draft and
          suggest actions, but it will not mutate records.
        </p>
      </div>

      <ChatPanel />
    </div>
  );
}
