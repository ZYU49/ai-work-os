import { describe, expect, it } from "vitest";
import { agentSystemPrompt, buildAgentUserPrompt } from "./prompts";

describe("agent prompts", () => {
  it("states MVP safety and confirmation rules", () => {
    expect(agentSystemPrompt).toContain("You are the AI Work OS Agent.");
    expect(agentSystemPrompt).toContain("Use only provided context and safe tool results.");
    expect(agentSystemPrompt).toContain("Do not claim external integrations exist in MVP.");
    expect(agentSystemPrompt).toContain("produce a draft action and ask for confirmation");
  });

  it("wraps context and message in a compact user prompt", () => {
    const prompt = buildAgentUserPrompt({
      message: "What is urgent?",
      contextText: "Task task-1: Call buyer",
    });

    expect(prompt).toContain("Provided context:");
    expect(prompt).toContain("Task task-1");
    expect(prompt).toContain("User message:");
    expect(prompt).toContain("What is urgent?");
  });
});
