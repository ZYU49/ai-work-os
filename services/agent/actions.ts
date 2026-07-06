import { zodResponseFormat } from "openai/helpers/zod";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { OpenAIConfigurationError, getOpenAIClient } from "../../lib/openai";
import { prisma } from "../../lib/db";
import { buildAgentContext, type AgentScope } from "./context-builder";
import { resolveProjectReference, type AgentProjectReference } from "./tools";
import {
  emailAnalysisSchema,
  type EmailAnalysis,
} from "./schemas";
import {
  agentSystemPrompt,
  buildAgentUserPrompt,
  buildEmailAnalysisPrompt,
  emailAnalysisSystemPrompt,
} from "./prompts";

type AnalyzableEmail = {
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  sentAt: Date;
  body: string | null;
  project?: { name: string } | null;
};

export class EmailAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailAnalysisError";
  }
}

export class AgentChatError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AgentChatError";
    this.statusCode = statusCode;
  }
}

export { OpenAIConfigurationError };

export const agentChatInputSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1, "Message is required"),
  scope: z.enum(["all", "project", "today"]).default("all"),
  projectId: z.string().trim().min(1).optional(),
});

export type AgentChatInput = z.infer<typeof agentChatInputSchema>;

type AgentChatClient = {
  project: {
    findFirst(args: Prisma.ProjectFindFirstArgs): Promise<unknown>;
  };
  agentConversation: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; projectId: true };
    }): Promise<{ id: string; projectId: string | null } | null>;
    create(args: {
      data: {
        title: string;
        projectId?: string | null;
        context?: object;
      };
    }): Promise<{ id: string; projectId: string | null }>;
    update(args: {
      where: { id: string };
      data: { projectId: string | null; context?: object };
    }): Promise<{ id: string; projectId: string | null }>;
  };
  agentMessage: {
    create(args: {
      data: {
        conversationId: string;
        role: string;
        content: string;
        metadata?: object;
      };
    }): Promise<{
      id: string;
      conversationId: string;
      role: string;
      content: string;
      metadata: unknown;
      createdAt: Date;
    }>;
  };
};

function ensureOpenAIConfigured() {
  if (!process.env.OPENAI_API_KEY) {
    throw new OpenAIConfigurationError(
      "OPENAI_API_KEY is required to use Agent chat.",
    );
  }
}

function conversationTitle(message: string) {
  return message.length > 80 ? `${message.slice(0, 77)}...` : message;
}

type ResolvedAgentChatInput = AgentChatInput & {
  resolvedProject: AgentProjectReference | null;
};

function contextMetadata(input: ResolvedAgentChatInput) {
  return {
    scope: input.scope,
    projectId: input.resolvedProject?.id ?? null,
    ...(input.resolvedProject
      ? { projectName: input.resolvedProject.name }
      : {}),
  };
}

async function resolveAgentChatProject(
  input: AgentChatInput,
  client: AgentChatClient,
): Promise<ResolvedAgentChatInput> {
  if (input.scope !== "project") {
    return { ...input, resolvedProject: null };
  }

  if (!input.projectId) {
    throw new AgentChatError("Project scope requires a project name or ID.");
  }

  const resolvedProject = await resolveProjectReference(input.projectId, client);

  if (!resolvedProject) {
    throw new AgentChatError("Project not found for Agent chat.", 404);
  }

  return { ...input, projectId: resolvedProject.id, resolvedProject };
}

async function getOrCreateConversation(
  input: ResolvedAgentChatInput,
  client: AgentChatClient,
) {
  const context = contextMetadata(input);

  if (input.conversationId) {
    const existing = await client.agentConversation.findUnique({
      where: { id: input.conversationId },
      select: { id: true, projectId: true },
    });

    if (!existing) {
      throw new AgentChatError("Agent conversation not found.", 404);
    }

    return client.agentConversation.update({
      where: { id: existing.id },
      data: {
        projectId: input.resolvedProject?.id ?? null,
        context,
      },
    });
  }

  return client.agentConversation.create({
    data: {
      title: conversationTitle(input.message),
      projectId: input.resolvedProject?.id ?? null,
      context,
    },
  });
}

function assistantContentFromCompletion(completion: {
  choices: Array<{ message?: { content?: string | null } }>;
}) {
  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new AgentChatError("OpenAI did not return an assistant message.");
  }

  return content;
}

export async function analyzeEmailWithAI(
  email: AnalyzableEmail,
): Promise<EmailAnalysis> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-5.5";

  const completion = await client.chat.completions.parse({
    model,
    messages: [
      { role: "system", content: emailAnalysisSystemPrompt },
      { role: "user", content: buildEmailAnalysisPrompt(email) },
    ],
    response_format: zodResponseFormat(emailAnalysisSchema, "email_analysis"),
  });

  const message = completion.choices[0]?.message;

  if (message?.refusal) {
    throw new EmailAnalysisError(`OpenAI refused to analyze the email: ${message.refusal}`);
  }

  if (!message?.parsed) {
    throw new EmailAnalysisError("OpenAI did not return a parseable email analysis.");
  }

  return message.parsed;
}

export async function sendAgentChatMessage(
  rawInput: AgentChatInput,
  client: AgentChatClient = prisma as unknown as AgentChatClient,
) {
  const input = agentChatInputSchema.parse(rawInput);
  ensureOpenAIConfigured();
  const resolvedInput = await resolveAgentChatProject(input, client);

  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  const builtContext = await buildAgentContext({
    message: resolvedInput.message,
    scope: resolvedInput.scope as AgentScope,
    projectId: resolvedInput.projectId,
  });
  const conversation = await getOrCreateConversation(resolvedInput, client);

  const userMessage = await client.agentMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: resolvedInput.message,
      metadata: contextMetadata(resolvedInput),
    },
  });

  const completion = await getOpenAIClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: agentSystemPrompt },
      {
        role: "user",
        content: buildAgentUserPrompt({
          message: input.message,
          contextText: builtContext.text,
        }),
      },
    ],
  });
  const assistantContent = assistantContentFromCompletion(completion);
  const assistantMessage = await client.agentMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: assistantContent,
      metadata: {
        scope: input.scope,
        projectId: resolvedInput.resolvedProject?.id ?? null,
        ...(resolvedInput.resolvedProject
          ? { projectName: resolvedInput.resolvedProject.name }
          : {}),
        model,
        contextSummaryLength: builtContext.summaryLength,
        toolNames: builtContext.toolNames,
      },
    },
  });

  return {
    conversation,
    messages: {
      user: userMessage,
      assistant: assistantMessage,
    },
    metadata: {
      scope: input.scope,
      projectId: resolvedInput.resolvedProject?.id ?? null,
      ...(resolvedInput.resolvedProject
        ? { projectName: resolvedInput.resolvedProject.name }
        : {}),
      model,
      contextSummaryLength: builtContext.summaryLength,
      toolNames: builtContext.toolNames,
    },
  };
}
