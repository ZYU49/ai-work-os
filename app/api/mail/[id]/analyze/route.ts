import { Prisma } from "@prisma/client";
import { EmailAnalysisError, OpenAIConfigurationError, analyzeEmailWithAI } from "@/services/agent/actions";
import { getEmailById, saveEmailAnalysis } from "@/services/mail";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

type AnalyzeRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: AnalyzeRouteContext) {
  try {
    const { id } = await context.params;
    const email = await getEmailById(id);

    if (!email) {
      return errorResponse("Email not found.", 404);
    }

    const analysis = await analyzeEmailWithAI(email);
    const saved = await saveEmailAnalysis(id, analysis);

    return Response.json({
      analysis,
      email: saved.email,
      emailAnalysis: saved.analysis,
    });
  } catch (error) {
    if (error instanceof OpenAIConfigurationError) {
      return errorResponse(error.message, 503, { code: "OPENAI_CONFIGURATION" });
    }

    if (error instanceof EmailAnalysisError) {
      return errorResponse(error.message, 502);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return errorResponse("Email not found.", 404);
    }

    console.error("Failed to analyze email", error);
    return errorResponse("Unable to analyze email. Check service configuration.", 503);
  }
}
