import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  getProjectById,
  updateProject,
  updateProjectSchema,
} from "@/services/projects";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: ProjectRouteContext) {
  try {
    const { id } = await context.params;
    const project = await getProjectById(id);

    if (!project) {
      return errorResponse("Project not found.", 404);
    }

    return Response.json({ project });
  } catch (error) {
    console.error("Failed to load project", error);
    return errorResponse("Unable to load project.", 503);
  }
}

export async function PATCH(request: Request, context: ProjectRouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const input = updateProjectSchema.parse(body);
    const project = await updateProject(id, input);

    return Response.json({ project });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return errorResponse("Project input is invalid.", 400, error.flatten());
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return errorResponse("Project not found.", 404);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse("Project name already exists.", 409);
    }

    console.error("Failed to update project", error);
    return errorResponse("Unable to update project.", 503);
  }
}
