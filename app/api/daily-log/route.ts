import { ZodError, z } from "zod";
import { parseDateKey } from "@/lib/dates";
import { generateDailyLog, getDailyLogContext } from "@/services/daily-log";

export const dynamic = "force-dynamic";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const postSchema = z.object({ date: dateSchema }).strict();

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

function dateFromKey(dateKey: string | null | undefined) {
  return dateKey ? parseDateKey(dateKey) : new Date();
}

function isDateKeyError(error: unknown) {
  return error instanceof Error && error.message.startsWith("Date must be");
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const date = dateFromKey(dateSchema.parse(searchParams.get("date") ?? undefined));
    const context = await getDailyLogContext(date);

    return Response.json({
      dateKey: context.dateKey,
      context,
      log: context.existingLog,
    });
  } catch (error) {
    if (error instanceof ZodError || isDateKeyError(error)) {
      return errorResponse(
        error instanceof Error ? error.message : "Date must be in YYYY-MM-DD format.",
        400,
      );
    }

    console.error("Failed to load daily log", error);
    return errorResponse(
      "Unable to load daily log. Check database configuration.",
      503,
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch((error: unknown) => {
      if (error instanceof SyntaxError) {
        throw error;
      }

      return {};
    });
    const input = postSchema.parse(body);
    const date = dateFromKey(input.date ?? null);
    const { log, context } = await generateDailyLog(date);

    return Response.json({
      dateKey: context.dateKey,
      context,
      log,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError || isDateKeyError(error)) {
      return errorResponse(
        error instanceof Error ? error.message : "Date must be in YYYY-MM-DD format.",
        400,
      );
    }

    console.error("Failed to generate daily log", error);
    return errorResponse(
      "Unable to generate daily log. Check database configuration.",
      503,
    );
  }
}
