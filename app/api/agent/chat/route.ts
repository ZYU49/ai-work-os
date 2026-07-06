import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  AgentChatError,
  OpenAIConfigurationError,
  agentChatInputSchema,
  sendAgentChatMessage,
} from "@/services/agent/actions";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = agentChatInputSchema.parse(body);
    const result = await sendAgentChatMessage(input);

    return Response.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return errorResponse("Agent chat input is invalid.", 400, error.flatten());
    }

    if (error instanceof OpenAIConfigurationError) {
      return errorResponse(error.message, 503, { code: "OPENAI_CONFIGURATION" });
    }

    if (error instanceof AgentChatError) {
      return errorResponse(error.message, error.statusCode);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025" || error.code === "P2003") {
        return errorResponse("Referenced conversation or project was not found.", 404);
      }
    }

    console.error("Failed to run Agent chat", error);
    return errorResponse(
      "Agent chat is unavailable. Check PostgreSQL and OpenAI configuration.",
      503,
    );
  }
}
