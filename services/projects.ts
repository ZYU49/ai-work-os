import {
  Prisma,
  Priority,
  ProjectStatus,
  type PrismaClient,
  type Project,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";

const projectStatusValues = Object.values(ProjectStatus) as [
  ProjectStatus,
  ...ProjectStatus[],
];
const priorityValues = Object.values(Priority) as [Priority, ...Priority[]];

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  companyName: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  priority: z.enum(priorityValues).optional(),
  status: z.enum(projectStatusValues).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  "At least one field is required",
);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export type ProjectListItem = Project & {
  openTaskCount: number;
  openFollowUpCount: number;
};

const projectDetailInclude = {
  contacts: {
    orderBy: [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }],
  },
  emails: {
    orderBy: [{ sentAt: "desc" as const }, { createdAt: "desc" as const }],
  },
  files: {
    orderBy: [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }],
  },
  notes: {
    orderBy: [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }],
  },
  tasks: {
    orderBy: [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }],
  },
  followUps: {
    orderBy: [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }],
  },
} satisfies Prisma.ProjectInclude;

type ActivityAction = "project.created" | "project.updated";
type ActivityWriter = Pick<PrismaClient, "activityLog">;

async function writeProjectActivity(
  client: ActivityWriter,
  projectId: string,
  action: ActivityAction,
  metadata?: Prisma.InputJsonValue,
) {
  await client.activityLog.create({
    data: {
      projectId,
      action,
      entityType: "Project",
      entityId: projectId,
      metadata,
    },
  });
}

function createProjectData(
  input: CreateProjectInput,
): Prisma.ProjectCreateInput {
  return {
    name: input.name,
    ...(input.companyName !== undefined
      ? { companyName: input.companyName }
      : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    lastActivityAt: new Date(),
  };
}

function updateProjectData(
  input: UpdateProjectInput,
): Prisma.ProjectUpdateInput {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.companyName !== undefined
      ? { companyName: input.companyName }
      : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    lastActivityAt: new Date(),
  };
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const projects = await prisma.project.findMany({
    orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
    include: {
      tasks: {
        where: { status: { not: "completed" } },
        select: { id: true },
      },
      followUps: {
        where: { status: { not: "done" } },
        select: { id: true },
      },
    },
  });

  return projects.map(({ tasks, followUps, ...project }) => ({
    ...project,
    openTaskCount: tasks.length,
    openFollowUpCount: followUps.length,
  }));
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: projectDetailInclude,
  });
}

export async function createProject(input: CreateProjectInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: createProjectData(input),
    });

    await writeProjectActivity(tx, project.id, "project.created", {
      name: input.name,
      companyName: input.companyName ?? null,
    });

    return project;
  });
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id },
      data: updateProjectData(input),
    });

    await writeProjectActivity(tx, project.id, "project.updated", {
      changedFields: Object.keys(input),
      companyName: input.companyName ?? null,
    });

    return project;
  });
}
