import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  createNote,
  createNoteSchema,
  listNotes,
  noteFiltersSchema,
} from "@/services/notes";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

function isMissingProject(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2003" || error.code === "P2025")
  );
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const notes = await listNotes(
      noteFiltersSchema.parse({
        projectId: searchParams.get("projectId") ?? undefined,
        type: searchParams.get("type") ?? undefined,
        query: searchParams.get("query") ?? searchParams.get("q") ?? undefined,
      }),
    );

    return Response.json({ notes });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Note filters are invalid.", 400, error.flatten());
    }

    console.error("Failed to list notes", error);
    return errorResponse("Unable to load notes. Check database configuration.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const note = await createNote(createNoteSchema.parse(body));

    return Response.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return errorResponse("Note input is invalid.", 400, error.flatten());
    }

    if (isMissingProject(error)) {
      return errorResponse("Project not found.", 404);
    }

    console.error("Failed to create note", error);
    return errorResponse("Unable to create note. Check database configuration.", 503);
  }
}
