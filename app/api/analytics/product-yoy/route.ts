import { ZodError } from "zod";
import {
  getProductYoYAnalytics,
} from "@/services/analytics/product-yoy";
import { salesAnalyticsFiltersSchema } from "@/services/analytics/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function GET(request: Request) {
  try {
    const searchParams = Object.fromEntries(new URL(request.url).searchParams);
    const filters = salesAnalyticsFiltersSchema.parse(searchParams);
    return Response.json({ analytics: await getProductYoYAnalytics(filters) });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        "Product YoY analytics filters are invalid.",
        400,
        error.flatten(),
      );
    }

    console.error("Failed to load product YoY analytics", error);
    return errorResponse("Unable to load product YoY analytics.", 503);
  }
}
