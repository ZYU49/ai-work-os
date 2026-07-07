import { ZodError } from "zod";
import {
  commitMidstateImport,
  midstateCommitSchema,
} from "@/services/midstate/imports";

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
    const options = midstateCommitSchema.parse(body);
    return Response.json({ summary: await commitMidstateImport(id, options) });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }
    if (error instanceof ZodError) {
      return errorResponse(
        "Midstate import input is invalid.",
        400,
        error.flatten(),
      );
    }
    const message =
      error instanceof Error ? error.message : "Unable to import Midstate rows.";
    const status = message.includes("not found")
      ? 404
      : message.includes("already exists")
        ? 409
        : 503;
    console.error("Failed to commit Midstate import", error);
    return errorResponse(message, status);
  }
}
