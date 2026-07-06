import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  completeTask,
  createTask,
  createTaskSchema,
  listTasks,
  parsePatchTaskBody,
  taskFiltersSchema,
  updateTask,
  type UpdateTaskInput,
} from "@/services/tasks";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

function isKnownPrisma(error: unknown, codes: string[]) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    codes.includes(error.code)
  );
}

function updateInputFromPatch(
  patch: Exclude<ReturnType<typeof parsePatchTaskBody>, { action: "complete" }>,
): UpdateTaskInput {
  return Object.fromEntries(
    Object.entries({
      projectId: patch.projectId,
      assigneeId: patch.assigneeId,
      title: patch.title,
      description: patch.description,
      status: patch.status,
      priority: patch.priority,
      dueDate: patch.dueDate,
    }).filter(([, value]) => value !== undefined),
  ) as UpdateTaskInput;
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const tasks = await listTasks(
      taskFiltersSchema.parse({
        projectId: searchParams.get("projectId") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        priority: searchParams.get("priority") ?? undefined,
        dueBefore: searchParams.get("dueBefore") ?? undefined,
        dueAfter: searchParams.get("dueAfter") ?? undefined,
        query: searchParams.get("query") ?? searchParams.get("q") ?? undefined,
      }),
    );

    return Response.json({ tasks });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Task filters are invalid.", 400, error.flatten());
    }

    console.error("Failed to list tasks", error);
    return errorResponse("Unable to load tasks. Check database configuration.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const task = await createTask(createTaskSchema.parse(body));

    return Response.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return errorResponse("Task input is invalid.", 400, error.flatten());
    }

    if (isKnownPrisma(error, ["P2003"])) {
      return errorResponse("Project not found.", 404);
    }

    console.error("Failed to create task", error);
    return errorResponse("Unable to create task. Check database configuration.", 503);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const patch = parsePatchTaskBody(body);
    const task = "action" in patch
      ? await completeTask(patch.id)
      : await updateTask(patch.id, updateInputFromPatch(patch));

    return Response.json({ task });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return errorResponse("Task input is invalid.", 400, error.flatten());
    }

    if (isKnownPrisma(error, ["P2025"])) {
      return errorResponse("Task not found.", 404);
    }

    if (isKnownPrisma(error, ["P2003"])) {
      return errorResponse("Project not found.", 404);
    }

    console.error("Failed to update task", error);
    return errorResponse("Unable to update task. Check database configuration.", 503);
  }
}
