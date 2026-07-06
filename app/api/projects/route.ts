import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  createProject,
  createProjectSchema,
  listProjects,
} from "@/services/projects";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function GET() {
  try {
    const projects = await listProjects();
    return Response.json({ projects });
  } catch (error) {
    console.error("Failed to list projects", error);
    return errorResponse("Unable to load projects.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createProjectSchema.parse(body);
    const project = await createProject(input);

    return Response.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return errorResponse("Project input is invalid.", 400, error.flatten());
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse("Project name already exists.", 409);
    }

    console.error("Failed to create project", error);
    return errorResponse("Unable to create project.", 503);
  }
}
