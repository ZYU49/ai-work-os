import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentChatError,
  OpenAIConfigurationError,
  sendAgentChatMessage,
} from "./actions";
import { getOpenAIClient } from "../../lib/openai";
import { buildAgentContext } from "./context-builder";

vi.mock("../../lib/openai", () => ({
  OpenAIConfigurationError: class OpenAIConfigurationError extends Error {
    constructor(message = "OPENAI_API_KEY is not configured.") {
      super(message);
      this.name = "OpenAIConfigurationError";
    }
  },
  getOpenAIClient: vi.fn(),
}));

vi.mock("./context-builder", () => ({
  buildAgentContext: vi.fn().mockResolvedValue({
    text: "Project project-1: Acme Rollout",
    summaryLength: 31,
    toolNames: ["getProjectSummary"],
  }),
}));

const openAICompletionCreate = vi.fn().mockResolvedValue({
  choices: [{ message: { content: "Draft next action." } }],
});

function createChatClient(options: {
  conversation?: { id: string; projectId: string | null } | null;
  project?: { id: string; name: string } | null;
} = {}) {
  const conversation =
    options.conversation === undefined
      ? { id: "conversation-1", projectId: null }
      : options.conversation;
  const createdMessages: Array<{ role: string; content: string; metadata?: object }> = [];

  return {
    project: {
      findFirst: vi.fn().mockResolvedValue(options.project ?? null),
    },
    agentConversation: {
      findUnique: vi.fn().mockResolvedValue(conversation),
      create: vi.fn().mockResolvedValue({
        id: "conversation-1",
        projectId: options.project?.id ?? null,
      }),
      update: vi.fn().mockResolvedValue({
        id: conversation?.id ?? "conversation-1",
        projectId: options.project?.id ?? null,
      }),
    },
    agentMessage: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        createdMessages.push(data);

        return {
          id: `${data.role}-message`,
          conversationId: data.conversationId,
          role: data.role,
          content: data.content,
          metadata: data.metadata,
          createdAt: new Date("2026-07-06T15:00:00.000Z"),
        };
      }),
    },
    createdMessages,
  };
}

describe("sendAgentChatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    vi.mocked(getOpenAIClient).mockReturnValue({
      chat: { completions: { create: openAICompletionCreate } },
    } as never);
  });

  it("throws before DB mutation when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const client = createChatClient();

    await expect(
      sendAgentChatMessage(
        { message: "What is next?", scope: "all" },
        client,
      ),
    ).rejects.toBeInstanceOf(OpenAIConfigurationError);

    expect(client.agentConversation.create).not.toHaveBeenCalled();
    expect(client.agentMessage.create).not.toHaveBeenCalled();
    expect(getOpenAIClient).not.toHaveBeenCalled();
  });

  it("throws when a provided conversationId is not found", async () => {
    const client = createChatClient({ conversation: null });

    await expect(
      sendAgentChatMessage(
        {
          conversationId: "missing-conversation",
          message: "Continue",
          scope: "all",
        },
        client,
      ),
    ).rejects.toMatchObject({
      name: "AgentChatError",
      message: "Agent conversation not found.",
    });

    expect(client.agentConversation.create).not.toHaveBeenCalled();
    expect(client.agentMessage.create).not.toHaveBeenCalled();
    expect(getOpenAIClient).not.toHaveBeenCalled();
  });

  it("resolves project names to canonical ids before creating conversations", async () => {
    const client = createChatClient({
      conversation: null,
      project: { id: "project-1", name: "Acme Rollout" },
    });

    await sendAgentChatMessage(
      {
        message: "Summarize this project",
        scope: "project",
        projectId: "Acme Rollout",
      },
      client,
    );

    expect(client.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { id: "Acme Rollout" },
            { name: { equals: "Acme Rollout", mode: "insensitive" } },
            { companyName: { equals: "Acme Rollout", mode: "insensitive" } },
          ],
        },
      }),
    );
    expect(client.agentConversation.create).toHaveBeenCalledWith({
      data: {
        title: "Summarize this project",
        projectId: "project-1",
        context: {
          scope: "project",
          projectId: "project-1",
          projectName: "Acme Rollout",
        },
      },
    });
    expect(buildAgentContext).toHaveBeenCalledWith({
      message: "Summarize this project",
      scope: "project",
      projectId: "project-1",
    });
    expect(client.createdMessages[0].metadata).toEqual({
      scope: "project",
      projectId: "project-1",
      projectName: "Acme Rollout",
    });
  });

  it("throws before writes when project scope reference does not resolve", async () => {
    const client = createChatClient({ project: null });

    await expect(
      sendAgentChatMessage(
        {
          message: "Summarize this project",
          scope: "project",
          projectId: "Unknown project",
        },
        client,
      ),
    ).rejects.toBeInstanceOf(AgentChatError);

    expect(client.agentConversation.create).not.toHaveBeenCalled();
    expect(client.agentMessage.create).not.toHaveBeenCalled();
    expect(getOpenAIClient).not.toHaveBeenCalled();
  });

  it("clears projectId when existing conversation switches to all scope", async () => {
    const client = createChatClient({
      conversation: { id: "conversation-1", projectId: "project-1" },
    });

    await sendAgentChatMessage(
      {
        conversationId: "conversation-1",
        message: "What is next overall?",
        scope: "all",
      },
      client,
    );

    expect(client.agentConversation.update).toHaveBeenCalledWith({
      where: { id: "conversation-1" },
      data: {
        projectId: null,
        context: { scope: "all", projectId: null },
      },
    });
  });
});
