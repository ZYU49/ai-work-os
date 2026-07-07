import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/db";
import {
  getSalesAnalytics as readSalesAnalytics,
  type SalesAnalyticsFilters,
  type SalesAnalyticsOverview,
} from "../analytics/metrics";
import { getDailyLogContext } from "../daily-log";
import { getDashboardOverview } from "../dashboard";

const projectSummarySelect = {
  id: true,
  name: true,
  companyName: true,
  description: true,
  status: true,
  priority: true,
  lastActivityAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

const relatedProjectSelect = {
  id: true,
  name: true,
  companyName: true,
} satisfies Prisma.ProjectSelect;

type SerializableDate = string | null;

export type AgentProjectHit = {
  id: string;
  name: string;
  companyName: string | null;
  description: string | null;
  status: string;
  priority: string;
  lastActivityAt: SerializableDate;
  updatedAt: string;
};

export type AgentProjectReference = {
  id: string;
  name: string;
};

export type AgentEmailHit = {
  id: string;
  subject: string;
  from: string;
  sentAt: string;
  project: { id: string; name: string; companyName: string | null } | null;
  summary: string | null;
};

export type AgentTaskHit = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: SerializableDate;
  project: { id: string; name: string; companyName: string | null } | null;
};

export type AgentFollowUpHit = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: SerializableDate;
  project: { id: string; name: string; companyName: string | null } | null;
  contact: { id: string; name: string; company: string | null } | null;
};

export type AgentTodayOverview = {
  todayTasks: AgentTaskHit[];
  todayEmails: AgentEmailHit[];
  todayFiles: Array<{
    id: string;
    filename: string;
    category: string;
    project: { id: string; name: string; companyName: string | null } | null;
  }>;
  todayActivities: Array<{
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
    project: { id: string; name: string; companyName: string | null } | null;
  }>;
  recentProjects: Array<AgentProjectHit & {
    openTaskCount: number;
    openFollowUpCount: number;
  }>;
  openFollowUps: AgentFollowUpHit[];
};

export type AgentProjectSummary = AgentProjectHit & {
  openTasks: Array<Omit<AgentTaskHit, "project">>;
  openFollowUps: Array<Omit<AgentFollowUpHit, "project" | "contact">>;
  recentNotes: Array<{
    id: string;
    title: string | null;
    excerpt: string;
    createdAt: string;
  }>;
  recentEmails: Array<{
    id: string;
    subject: string;
    from: string;
    sentAt: string;
    summary: string | null;
  }>;
};

export type AgentDailyLogContext = {
  dateKey: string;
  existingLog: {
    id: string;
    summary: string | null;
    wins: string | null;
    blockers: string | null;
  } | null;
  counts: {
    emails: number;
    tasks: number;
    files: number;
    notes: number;
    activities: number;
  };
  emails: AgentEmailHit[];
  tasks: AgentTaskHit[];
  notes: Array<{ id: string; title: string | null; excerpt: string }>;
  activities: Array<{ id: string; action: string; entityType: string | null }>;
};

type AgentToolClient = {
  project: {
    findFirst(args: Prisma.ProjectFindFirstArgs): Promise<unknown>;
    findMany(args: Prisma.ProjectFindManyArgs): Promise<unknown[]>;
  };
  email: {
    findMany(args: Prisma.EmailFindManyArgs): Promise<unknown[]>;
  };
  task: {
    findMany(args: Prisma.TaskFindManyArgs): Promise<unknown[]>;
  };
  followUp: {
    findMany(args: Prisma.FollowUpFindManyArgs): Promise<unknown[]>;
  };
};

type AgentProjectResolverClient = {
  project: {
    findFirst(args: Prisma.ProjectFindFirstArgs): Promise<unknown>;
  };
};

function iso(value: Date | string | null | undefined): SerializableDate {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function excerpt(value: string | null | undefined, maxLength = 160) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
}

function compactProject(project: {
  id: string;
  name: string;
  companyName?: string | null;
  description?: string | null;
  status?: string;
  priority?: string;
  lastActivityAt?: Date | string | null;
  updatedAt?: Date | string;
}): AgentProjectHit {
  return {
    id: project.id,
    name: project.name,
    companyName: project.companyName ?? null,
    description: project.description ?? null,
    status: project.status ?? "unknown",
    priority: project.priority ?? "medium",
    lastActivityAt: iso(project.lastActivityAt),
    updatedAt: iso(project.updatedAt) ?? new Date(0).toISOString(),
  };
}

function compactRelatedProject(
  project: { id: string; name: string; companyName?: string | null } | null | undefined,
) {
  return project
    ? {
        id: project.id,
        name: project.name,
        companyName: project.companyName ?? null,
      }
    : null;
}

function compactTask(task: {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  project?: { id: string; name: string; companyName?: string | null } | null;
}): AgentTaskHit {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: iso(task.dueDate),
    project: compactRelatedProject(task.project),
  };
}

function compactEmail(email: {
  id: string;
  subject: string;
  from: string;
  sentAt: Date | string;
  project?: { id: string; name: string; companyName?: string | null } | null;
  analysis?: { summary: string | null } | null;
}): AgentEmailHit {
  return {
    id: email.id,
    subject: email.subject,
    from: email.from,
    sentAt: iso(email.sentAt) ?? new Date(0).toISOString(),
    project: compactRelatedProject(email.project),
    summary: email.analysis?.summary ?? null,
  };
}

function compactFollowUp(followUp: {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  project?: { id: string; name: string; companyName?: string | null } | null;
  contact?: { id: string; name: string; company?: string | null } | null;
}): AgentFollowUpHit {
  return {
    id: followUp.id,
    title: followUp.title,
    status: followUp.status,
    priority: followUp.priority,
    dueDate: iso(followUp.dueDate),
    project: compactRelatedProject(followUp.project),
    contact: followUp.contact
      ? {
          id: followUp.contact.id,
          name: followUp.contact.name,
          company: followUp.contact.company ?? null,
        }
      : null,
  };
}

function keywordFilter(query: string) {
  return { contains: query.trim(), mode: "insensitive" as const };
}

export async function getTodayOverview(): Promise<AgentTodayOverview> {
  const overview = await getDashboardOverview();

  return {
    todayTasks: overview.todayTasks.map(compactTask),
    todayEmails: overview.todayEmails.map(compactEmail),
    todayFiles: overview.todayFiles.map((file) => ({
      id: file.id,
      filename: file.filename,
      category: file.category,
      project: compactRelatedProject(file.project),
    })),
    todayActivities: overview.todayActivities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      createdAt: activity.createdAt.toISOString(),
      project: compactRelatedProject(activity.project),
    })),
    recentProjects: overview.recentProjects.map((project) => ({
      ...compactProject(project),
      openTaskCount: project.tasks.length,
      openFollowUpCount: project.followUps.length,
    })),
    openFollowUps: overview.openFollowUps.map(compactFollowUp),
  };
}

export async function getProjectSummary(
  projectNameOrId: string,
  client: Pick<AgentToolClient, "project"> = prisma as unknown as Pick<AgentToolClient, "project">,
): Promise<AgentProjectSummary | null> {
  const query = projectNameOrId.trim();

  if (!query) {
    return null;
  }

  const project = await client.project.findFirst({
    where: {
      OR: [
        { id: query },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      tasks: {
        take: 8,
        where: { status: { not: "completed" } },
        orderBy: [
          { dueDate: { sort: "asc", nulls: "last" } },
          { priority: "desc" },
          { updatedAt: "desc" },
        ],
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
      },
      followUps: {
        take: 8,
        where: { status: { not: "done" } },
        orderBy: [
          { dueDate: { sort: "asc", nulls: "last" } },
          { priority: "desc" },
          { updatedAt: "desc" },
        ],
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
      },
      notes: {
        take: 5,
        orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
        },
      },
      emails: {
        take: 5,
        orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          subject: true,
          from: true,
          sentAt: true,
          analysis: { select: { summary: true } },
        },
      },
    },
  }) as (AgentProjectSummary & {
    tasks: Array<Parameters<typeof compactTask>[0]>;
    followUps: Array<Parameters<typeof compactFollowUp>[0]>;
    notes: Array<{ id: string; title: string | null; content: string; createdAt: Date }>;
    emails: Array<Parameters<typeof compactEmail>[0]>;
  }) | null;

  if (!project) {
    return null;
  }

  return {
    ...compactProject(project),
    openTasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: iso(task.dueDate),
    })),
    openFollowUps: project.followUps.map((followUp) => ({
      id: followUp.id,
      title: followUp.title,
      status: followUp.status,
      priority: followUp.priority,
      dueDate: iso(followUp.dueDate),
    })),
    recentNotes: project.notes.map((note) => ({
      id: note.id,
      title: note.title,
      excerpt: excerpt(note.content),
      createdAt: note.createdAt.toISOString(),
    })),
    recentEmails: project.emails.map((email) => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      sentAt: iso(email.sentAt) ?? new Date(0).toISOString(),
      summary: email.analysis?.summary ?? null,
    })),
  };
}

export async function resolveProjectReference(
  ref: string,
  client: AgentProjectResolverClient = prisma as unknown as AgentProjectResolverClient,
): Promise<AgentProjectReference | null> {
  const query = ref.trim();

  if (!query) {
    return null;
  }

  const project = await client.project.findFirst({
    where: {
      OR: [
        { id: query },
        { name: { equals: query, mode: "insensitive" } },
        { companyName: { equals: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  }) as AgentProjectReference | null;

  return project;
}

export async function searchProjects(
  query: string,
  client: Pick<AgentToolClient, "project"> = prisma as unknown as Pick<AgentToolClient, "project">,
): Promise<AgentProjectHit[]> {
  const keyword = query.trim();

  if (!keyword) {
    return [];
  }

  const projects = await client.project.findMany({
    take: 8,
    where: {
      OR: [
        { name: keywordFilter(keyword) },
        { companyName: keywordFilter(keyword) },
        { description: keywordFilter(keyword) },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: projectSummarySelect,
  }) as Array<Parameters<typeof compactProject>[0]>;

  return projects.map(compactProject);
}

export async function searchEmails(
  query: string,
  client: Pick<AgentToolClient, "email"> = prisma as unknown as Pick<AgentToolClient, "email">,
): Promise<AgentEmailHit[]> {
  const keyword = query.trim();

  if (!keyword) {
    return [];
  }

  const emails = await client.email.findMany({
    take: 8,
    where: {
      OR: [
        { subject: keywordFilter(keyword) },
        { from: keywordFilter(keyword) },
        { body: keywordFilter(keyword) },
      ],
    },
    orderBy: [{ sentAt: "desc" }, { updatedAt: "desc" }],
    include: {
      project: { select: relatedProjectSelect },
      analysis: { select: { summary: true } },
    },
  }) as Array<Parameters<typeof compactEmail>[0]>;

  return emails.map(compactEmail);
}

export async function getDueTasks(
  daysAhead: number,
  client: Pick<AgentToolClient, "task"> = prisma as unknown as Pick<AgentToolClient, "task">,
  now = new Date(),
): Promise<AgentTaskHit[]> {
  const boundedDays = Math.min(Math.max(Math.trunc(daysAhead), 0), 30);
  const end = new Date(now);
  end.setDate(end.getDate() + boundedDays);

  const tasks = await client.task.findMany({
    take: 12,
    where: {
      status: { not: "completed" },
      dueDate: { gte: now, lte: end },
    },
    orderBy: [
      { dueDate: { sort: "asc", nulls: "last" } },
      { priority: "desc" },
      { updatedAt: "desc" },
    ],
    include: { project: { select: relatedProjectSelect } },
  }) as Array<Parameters<typeof compactTask>[0]>;

  return tasks.map(compactTask);
}

export async function getOpenFollowUps(
  client: Pick<AgentToolClient, "followUp"> = prisma as unknown as Pick<AgentToolClient, "followUp">,
): Promise<AgentFollowUpHit[]> {
  const followUps = await client.followUp.findMany({
    take: 12,
    where: { status: "open" },
    orderBy: [
      { dueDate: { sort: "asc", nulls: "last" } },
      { priority: "desc" },
      { updatedAt: "desc" },
    ],
    include: {
      project: { select: relatedProjectSelect },
      contact: { select: { id: true, name: true, company: true } },
    },
  }) as Array<Parameters<typeof compactFollowUp>[0]>;

  return followUps.map(compactFollowUp);
}

export async function getDailyLogContextForAgent(
  date: Date,
): Promise<AgentDailyLogContext> {
  const context = await getDailyLogContext(date);

  return {
    dateKey: context.dateKey,
    existingLog: context.existingLog
      ? {
          id: context.existingLog.id,
          summary: context.existingLog.summary,
          wins: context.existingLog.wins,
          blockers: context.existingLog.blockers,
        }
      : null,
    counts: {
      emails: context.emails.length,
      tasks: context.tasks.length,
      files: context.files.length,
      notes: context.notes.length,
      activities: context.activities.length,
    },
    emails: context.emails.slice(0, 8).map(compactEmail),
    tasks: context.tasks.slice(0, 8).map(compactTask),
    notes: context.notes.slice(0, 8).map((note) => ({
      id: note.id,
      title: note.title,
      excerpt: excerpt(note.content),
    })),
    activities: context.activities.slice(0, 8).map((activity) => ({
      id: activity.id,
      action: activity.action,
      entityType: activity.entityType,
    })),
  };
}

export async function getSalesAnalytics(
  filters: SalesAnalyticsFilters = { year: new Date().getFullYear() },
): Promise<SalesAnalyticsOverview> {
  return readSalesAnalytics(filters);
}

export const agentTools = {
  getTodayOverview,
  getProjectSummary,
  searchProjects,
  searchEmails,
  getDueTasks,
  getOpenFollowUps,
  getDailyLogContextForAgent,
  getSalesAnalytics,
  resolveProjectReference,
};

export type AgentTools = typeof agentTools;
