import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  createEmailFromPaste,
  createEmailFromPasteSchema,
  listEmails,
} from "@/services/mail";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function GET() {
  try {
    const emails = await listEmails();
    return Response.json({ emails });
  } catch (error) {
    console.error("Failed to list emails", error);
    return errorResponse("Unable to load mail. Check database configuration.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createEmailFromPasteSchema.parse(body);
    const email = await createEmailFromPaste(input);

    return Response.json({ email }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return errorResponse("Pasted email input is invalid.", 400, error.flatten());
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2025" || error.code === "P2003")
    ) {
      return errorResponse("Project not found.", 404);
    }

    console.error("Failed to create pasted email", error);
    return errorResponse("Unable to save pasted email. Check database configuration.", 503);
  }
}
