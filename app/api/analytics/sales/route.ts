import { ZodError } from "zod";
import {
  getSalesAnalytics,
  salesAnalyticsFiltersSchema,
} from "@/services/analytics/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function GET(request: Request) {
  try {
    const searchParams = Object.fromEntries(new URL(request.url).searchParams);
    const filters = salesAnalyticsFiltersSchema.parse(searchParams);
    return Response.json({ analytics: await getSalesAnalytics(filters) });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        "Sales analytics filters are invalid.",
        400,
        error.flatten(),
      );
    }

    console.error("Failed to load sales analytics", error);
    return errorResponse("Unable to load sales analytics.", 503);
  }
}
