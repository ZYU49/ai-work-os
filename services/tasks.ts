import { Prisma, Priority, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { recordActivity } from "../lib/activity";
import { prisma } from "../lib/db";

const taskStatusValues = Object.values(TaskStatus) as [
  TaskStatus,
  ...TaskStatus[],
];
const priorityValues = Object.values(Priority) as [Priority, ...Priority[]];

export const taskStatusSchema = z.enum(taskStatusValues);
export const taskPrioritySchema = z.enum(priorityValues);

const CHICAGO_TIME_ZONE = "America/Chicago";
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const dueDateSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Date is invalid");

const taskInputShape = {
  projectId: z.string().trim().min(1).optional(),
  assigneeId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1).optional(),
  status: taskStatusSchema.default(TaskStatus.not_started),
  priority: taskPrioritySchema.default(Priority.medium),
  dueDate: dueDateSchema.optional(),
};

const taskUpdateInputShape = {
  projectId: z.string().trim().min(1).optional(),
  assigneeId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1, "Title is required").optional(),
  description: z.string().trim().min(1).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: dueDateSchema.optional(),
};

export const taskFiltersSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueBefore: dueDateSchema.optional(),
  dueAfter: dueDateSchema.optional(),
  query: z.string().trim().min(1).optional(),
});

export const createTaskSchema = z.object(taskInputShape).strict();

export const updateTaskSchema = z
  .object(taskUpdateInputShape)
  .strict()
  .refine(
    (input) => Object.keys(input).length > 0,
    "At least one field is required",
  );

const patchTaskCompleteSchema = z
  .object({
    id: z.string().trim().min(1, "Task ID is required"),
    action: z.literal("complete"),
  })
  .strict();

const patchTaskUpdateSchema = z
  .object({
    id: z.string().trim().min(1, "Task ID is required"),
    ...taskUpdateInputShape,
  })
  .strict()
  .refine(
    (input) => Object.keys(input).some((key) => key !== "id"),
    "At least one field is required",
  );

export type TaskFilters = z.infer<typeof taskFiltersSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type PatchTaskInput =
  | z.infer<typeof patchTaskCompleteSchema>
  | z.infer<typeof patchTaskUpdateSchema>;

const taskListInclude = {
  project: true,
} satisfies Prisma.TaskInclude;

export type TaskListItem = Prisma.TaskGetPayload<{
  include: typeof taskListInclude;
}>;

type TaskReadClient = {
  task: {
    findMany(args: Prisma.TaskFindManyArgs): Promise<TaskListItem[]>;
  };
};

type TaskTransactionClient = {
  task: {
    findUniqueOrThrow(args: Prisma.TaskFindUniqueOrThrowArgs): Promise<{
      status: TaskStatus;
      completedAt: Date | null;
    }>;
    create(args: Prisma.TaskCreateArgs): Promise<TaskListItem>;
    update(args: Prisma.TaskUpdateArgs): Promise<TaskListItem>;
  };
  activityLog: {
    create(args: Prisma.ActivityLogCreateArgs): Promise<unknown>;
  };
};

type TaskWriteClient = {
  $transaction<T>(callback: (tx: TaskTransactionClient) => Promise<T>): Promise<T>;
};

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function localMidnightToUtcDate(
  year: number,
  month: number,
  day: number,
  timeZone: string,
) {
  const targetUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let utcInstant = targetUtc;

  for (let index = 0; index < 3; index += 1) {
    const parts = getTimeZoneParts(new Date(utcInstant), timeZone);
    const representedUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const difference = representedUtc - targetUtc;

    if (difference === 0) {
      break;
    }

    utcInstant -= difference;
  }

  return new Date(utcInstant);
}

function parseDateOnlyParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

export function parseDateOnlyAsChicagoStart(value: string) {
  const { year, month, day } = parseDateOnlyParts(value);
  return localMidnightToUtcDate(year, month, day, CHICAGO_TIME_ZONE);
}

export function parseDateOnlyAsChicagoEndExclusive(value: string) {
  const { year, month, day } = parseDateOnlyParts(value);
  return localMidnightToUtcDate(year, month, day + 1, CHICAGO_TIME_ZONE);
}

function isDateOnly(value: string) {
  return dateOnlyPattern.test(value);
}

function parseTaskDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return isDateOnly(value) ? parseDateOnlyAsChicagoStart(value) : new Date(value);
}

function applyDueAfter(value: string, dueDate: Prisma.DateTimeNullableFilter) {
  dueDate.gte = parseTaskDate(value);
}

function applyDueBefore(value: string, dueDate: Prisma.DateTimeNullableFilter) {
  if (isDateOnly(value)) {
    dueDate.lt = parseDateOnlyAsChicagoEndExclusive(value);
    return;
  }

  dueDate.lte = new Date(value);
}

export function parsePatchTaskBody(body: unknown): PatchTaskInput {
  if (body && typeof body === "object" && "action" in body) {
    return patchTaskCompleteSchema.parse(body);
  }

  return patchTaskUpdateSchema.parse(body);
}

function buildTaskWhere(filters: TaskFilters): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [];
  const dueDate: Prisma.DateTimeNullableFilter = {};

  if (filters.projectId) {
    and.push({ projectId: filters.projectId });
  }

  if (filters.status) {
    and.push({ status: filters.status });
  }

  if (filters.priority) {
    and.push({ priority: filters.priority });
  }

  if (filters.dueAfter) {
    applyDueAfter(filters.dueAfter, dueDate);
  }

  if (filters.dueBefore) {
    applyDueBefore(filters.dueBefore, dueDate);
  }

  if (Object.keys(dueDate).length > 0) {
    and.push({ dueDate });
  }

  if (filters.query) {
    and.push({
      OR: [
        { title: { contains: filters.query, mode: "insensitive" } },
        { description: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function taskCreateData(input: CreateTaskInput): Prisma.TaskCreateInput {
  const completedAt =
    input.status === TaskStatus.completed ? new Date() : undefined;

  return {
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: parseTaskDate(input.dueDate),
    completedAt,
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
  };
}

function completedAtUpdate(
  input: UpdateTaskInput,
  existingTask: { status: TaskStatus; completedAt: Date | null } | null,
) {
  if (input.status === TaskStatus.completed) {
    return {
      completedAt:
        existingTask?.status === TaskStatus.completed
          ? existingTask.completedAt
          : new Date(),
    };
  }

  if (input.status !== undefined) {
    return { completedAt: null };
  }

  return {};
}

function taskUpdateData(
  input: UpdateTaskInput,
  existingTask: { status: TaskStatus; completedAt: Date | null } | null,
): Prisma.TaskUpdateInput {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.dueDate !== undefined ? { dueDate: parseTaskDate(input.dueDate) } : {}),
    ...completedAtUpdate(input, existingTask),
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
  };
}

export async function listTasks(
  filters: TaskFilters = {},
  client: TaskReadClient = prisma as unknown as TaskReadClient,
) {
  const parsedFilters = taskFiltersSchema.parse(filters);

  return client.task.findMany({
    take: 100,
    where: buildTaskWhere(parsedFilters),
    orderBy: [
      { status: "asc" },
      { dueDate: { sort: "asc", nulls: "last" } },
      { priority: "desc" },
      { updatedAt: "desc" },
    ],
    include: taskListInclude,
  });
}

export async function createTask(
  input: CreateTaskInput,
  client: TaskWriteClient = prisma as unknown as TaskWriteClient,
) {
  const parsedInput = createTaskSchema.parse(input);

  return client.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: taskCreateData(parsedInput),
      include: taskListInclude,
    });

    await recordActivity(
      {
        projectId: task.projectId ?? undefined,
        action: "task.created",
        entityType: "Task",
        entityId: task.id,
        title: "Task created",
        description: task.title,
        metadata: {
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString() ?? null,
        },
      },
      tx,
    );

    return task;
  });
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  client: TaskWriteClient = prisma as unknown as TaskWriteClient,
) {
  const parsedInput = updateTaskSchema.parse(input);

  return client.$transaction(async (tx) => {
    const existingTask =
      parsedInput.status !== undefined
        ? await tx.task.findUniqueOrThrow({
            where: { id },
            select: { status: true, completedAt: true },
          })
        : null;
    const task = await tx.task.update({
      where: { id },
      data: taskUpdateData(parsedInput, existingTask),
      include: taskListInclude,
    });

    await recordActivity(
      {
        projectId: task.projectId ?? undefined,
        action: "task.updated",
        entityType: "Task",
        entityId: task.id,
        title: "Task updated",
        description: task.title,
        metadata: {
          changedFields: Object.keys(parsedInput),
          status: task.status,
          priority: task.priority,
        },
      },
      tx,
    );

    return task;
  });
}

export async function completeTask(
  id: string,
  client: TaskWriteClient = prisma as unknown as TaskWriteClient,
) {
  return client.$transaction(async (tx) => {
    const existingTask = await tx.task.findUniqueOrThrow({
      where: { id },
      select: { status: true, completedAt: true },
    });
    const task = await tx.task.update({
      where: { id },
      data: {
        status: TaskStatus.completed,
        completedAt:
          existingTask.status === TaskStatus.completed
            ? existingTask.completedAt
            : new Date(),
      },
      include: taskListInclude,
    });

    await recordActivity(
      {
        projectId: task.projectId ?? undefined,
        action: "task.completed",
        entityType: "Task",
        entityId: task.id,
        title: "Task completed",
        description: task.title,
        metadata: {
          status: task.status,
          completedAt: task.completedAt?.toISOString() ?? null,
        },
      },
      tx,
    );

    return task;
  });
}
