import { ZodError } from "zod";
import {
  commitSalesImport,
  salesMappingSchema,
} from "@/services/analytics/imports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const mapping = salesMappingSchema.parse(body.mapping ?? body);
    const summary = await commitSalesImport(id, mapping);
    if (summary.errors.length > 0) {
      return errorResponse("Sales field mapping is invalid.", 400, summary.errors);
    }
    return Response.json({ summary });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }
    if (error instanceof ZodError) {
      return errorResponse("Sales field mapping is invalid.", 400, error.flatten());
    }
    const message =
      error instanceof Error ? error.message : "Unable to import sales rows.";
    console.error("Failed to commit sales import", error);
    return errorResponse(message, message.includes("not found") ? 404 : 503);
  }
}
