import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  createKnowledgePage,
  createKnowledgePageSchema,
  knowledgeFiltersSchema,
  listKnowledgePages,
  updateKnowledgePage,
  updateKnowledgePageSchema,
} from "@/services/knowledge";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

function isMissingProjectOrPage(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2003" || error.code === "P2025")
  );
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const pages = await listKnowledgePages(
      knowledgeFiltersSchema.parse({
        projectId: searchParams.get("projectId") ?? undefined,
        category: searchParams.get("category") ?? undefined,
        tag: searchParams.get("tag") ?? undefined,
        query: searchParams.get("query") ?? searchParams.get("q") ?? undefined,
      }),
    );

    return Response.json({ pages });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Knowledge filters are invalid.", 400, error.flatten());
    }

    console.error("Failed to list knowledge pages", error);
    return errorResponse(
      "Unable to load knowledge pages. Check database configuration.",
      503,
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const page = await createKnowledgePage(createKnowledgePageSchema.parse(body));

    return Response.json({ page }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return errorResponse("Knowledge page input is invalid.", 400, error.flatten());
    }

    if (isMissingProjectOrPage(error)) {
      return errorResponse("Project not found.", 404);
    }

    console.error("Failed to create knowledge page", error);
    return errorResponse(
      "Unable to create knowledge page. Check database configuration.",
      503,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id.trim()) {
      return errorResponse("Knowledge page id is required.", 400);
    }

    const input = { ...body };
    delete input.id;
    const page = await updateKnowledgePage(
      id,
      updateKnowledgePageSchema.parse(input),
    );

    return Response.json({ page });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return errorResponse("Knowledge page input is invalid.", 400, error.flatten());
    }

    if (isMissingProjectOrPage(error)) {
      return errorResponse("Knowledge page or project not found.", 404);
    }

    console.error("Failed to update knowledge page", error);
    return errorResponse(
      "Unable to update knowledge page. Check database configuration.",
      503,
    );
  }
}
