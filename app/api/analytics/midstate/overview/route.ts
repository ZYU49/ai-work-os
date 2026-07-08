import { ZodError } from "zod";
import {
  getMidstateAnalytics,
  midstateAnalyticsFiltersSchema,
} from "@/services/midstate/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function GET(request: Request) {
  try {
    const searchParams = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );
    const filters = midstateAnalyticsFiltersSchema.parse(searchParams);
    return Response.json({ analytics: await getMidstateAnalytics(filters) });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        "Midstate analytics filters are invalid.",
        400,
        error.flatten(),
      );
    }
    console.error("Failed to load Midstate analytics", error);
    return errorResponse("Unable to load Midstate analytics.", 503);
  }
}
