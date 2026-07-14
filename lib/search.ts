import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { toDateKey } from "./dates";

export type SearchResultType =
  | "project"
  | "email"
  | "file"
  | "knowledge"
  | "task"
  | "note"
  | "dailyLog"
  | "contact";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  updatedAt?: Date;
  createdAt?: Date;
};

export type SearchGroups = {
  projects: SearchResult[];
  emails: SearchResult[];
  files: SearchResult[];
  knowledge: SearchResult[];
  tasks: SearchResult[];
  notes: SearchResult[];
  dailyLogs: SearchResult[];
  contacts: SearchResult[];
};

type SearchProject = Prisma.ProjectGetPayload<object>;
type SearchEmail = Prisma.EmailGetPayload<{
  include: { project: { select: { name: true } } };
}>;
type SearchFile = Prisma.FileAssetGetPayload<{
  include: { project: { select: { name: true } } };
}>;
type SearchKnowledge = Prisma.KnowledgePageGetPayload<{
  include: { project: { select: { name: true } } };
}>;
type SearchTask = Prisma.TaskGetPayload<{
  include: { project: { select: { name: true } } };
}>;
type SearchNote = Prisma.NoteGetPayload<{
  include: { project: { select: { name: true } } };
}>;
type SearchDailyLog = Prisma.DailyLogGetPayload<object>;
type SearchContact = Prisma.ContactGetPayload<{
  include: { project: { select: { name: true } } };
}>;

type SearchClient = {
  project: {
    findMany(args: Prisma.ProjectFindManyArgs): Promise<SearchProject[]>;
  };
  email: {
    findMany(args: Prisma.EmailFindManyArgs): Promise<SearchEmail[]>;
  };
  fileAsset: {
    findMany(args: Prisma.FileAssetFindManyArgs): Promise<SearchFile[]>;
  };
  knowledgePage: {
    findMany(args: Prisma.KnowledgePageFindManyArgs): Promise<SearchKnowledge[]>;
  };
  task: {
    findMany(args: Prisma.TaskFindManyArgs): Promise<SearchTask[]>;
  };
  note: {
    findMany(args: Prisma.NoteFindManyArgs): Promise<SearchNote[]>;
  };
  dailyLog: {
    findMany(args: Prisma.DailyLogFindManyArgs): Promise<SearchDailyLog[]>;
  };
  contact: {
    findMany(args: Prisma.ContactFindManyArgs): Promise<SearchContact[]>;
  };
};

const emptyGroups = (): SearchGroups => ({
  projects: [],
  emails: [],
  files: [],
  knowledge: [],
  tasks: [],
  notes: [],
  dailyLogs: [],
  contacts: [],
});

function contains(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

function joinSubtitle(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" - ") || undefined;
}

function firstLine(value: string | null | undefined) {
  return value?.split(/\r?\n/).find((line) => line.trim())?.trim();
}

export async function searchAll(
  query: string,
  client: SearchClient = prisma as unknown as SearchClient,
): Promise<SearchGroups> {
  const keyword = query.trim();

  if (!keyword) {
    return emptyGroups();
  }

  const [
    projects,
    emails,
    files,
    knowledgePages,
    tasks,
    notes,
    dailyLogs,
    contacts,
  ] = await Promise.all([
    client.project.findMany({
      take: 8,
      where: {
        OR: [
          { name: contains(keyword) },
          { companyName: contains(keyword) },
          { description: contains(keyword) },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    client.email.findMany({
      take: 8,
      where: {
        OR: [
          { subject: contains(keyword) },
          { from: contains(keyword) },
          { body: contains(keyword) },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { sentAt: "desc" }],
      include: { project: { select: { name: true } } },
    }),
    client.fileAsset.findMany({
      take: 8,
      where: {
        OR: [
          { filename: contains(keyword) },
          { summary: contains(keyword) },
          { url: contains(keyword) },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: { project: { select: { name: true } } },
    }),
    client.knowledgePage.findMany({
      take: 8,
      where: {
        OR: [
          { title: contains(keyword) },
          { content: contains(keyword) },
          { summary: contains(keyword) },
          { tags: { has: keyword } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: { project: { select: { name: true } } },
    }),
    client.task.findMany({
      take: 8,
      where: {
        OR: [
          { title: contains(keyword) },
          { description: contains(keyword) },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: { project: { select: { name: true } } },
    }),
    client.note.findMany({
      take: 8,
      where: {
        OR: [{ title: contains(keyword) }, { content: contains(keyword) }],
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: { project: { select: { name: true } } },
    }),
    client.dailyLog.findMany({
      take: 8,
      where: {
        OR: [
          { summary: contains(keyword) },
          { wins: contains(keyword) },
          { blockers: contains(keyword) },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { date: "desc" }],
    }),
    client.contact.findMany({
      take: 8,
      where: {
        OR: [
          { name: contains(keyword) },
          { email: contains(keyword) },
          { phone: contains(keyword) },
          { company: contains(keyword) },
          { role: contains(keyword) },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: { project: { select: { name: true } } },
    }),
  ]);

  return {
    projects: projects.map((project) => ({
      id: project.id,
      type: "project",
      title: project.name,
      subtitle: project.companyName ?? firstLine(project.description),
      href: `/projects/${project.id}`,
      updatedAt: project.updatedAt,
      createdAt: project.createdAt,
    })),
    emails: emails.map((email) => ({
      id: email.id,
      type: "email",
      title: email.subject,
      subtitle: joinSubtitle([email.from, email.project?.name]),
      href: `/mail?emailId=${email.id}`,
      updatedAt: email.updatedAt,
      createdAt: email.sentAt,
    })),
    files: files.map((file) => ({
      id: file.id,
      type: "file",
      title: file.filename,
      subtitle: joinSubtitle([file.category, file.project?.name, file.summary]),
      href: `/files?fileId=${file.id}`,
      updatedAt: file.updatedAt,
      createdAt: file.createdAt,
    })),
    knowledge: knowledgePages.map((page) => ({
      id: page.id,
      type: "knowledge",
      title: page.title,
      subtitle: joinSubtitle([
        page.category.replaceAll("_", " "),
        page.project?.name,
        page.summary ?? firstLine(page.content),
      ]),
      href: `/knowledge?knowledgeId=${page.id}`,
      updatedAt: page.updatedAt,
      createdAt: page.createdAt,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      type: "task",
      title: task.title,
      subtitle: joinSubtitle([task.status, task.priority, task.project?.name]),
      href: `/tasks?taskId=${task.id}`,
      updatedAt: task.updatedAt,
      createdAt: task.createdAt,
    })),
    notes: notes.map((note) => ({
      id: note.id,
      type: "note",
      title: note.title ?? firstLine(note.content) ?? "Untitled note",
      subtitle: joinSubtitle([note.type, note.project?.name]),
      href: `/notes?noteId=${note.id}`,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
    })),
    dailyLogs: dailyLogs.map((log) => {
      const dateKey = toDateKey(log.date);

      return {
        id: log.id,
        type: "dailyLog",
        title: `Daily Log - ${dateKey}`,
        subtitle: firstLine(log.summary),
        href: `/daily-log?date=${dateKey}`,
        updatedAt: log.updatedAt,
        createdAt: log.date,
      };
    }),
    contacts: contacts.map((contact) => ({
      id: contact.id,
      type: "contact",
      title: contact.name,
      subtitle: joinSubtitle([contact.company, contact.role, contact.project?.name]),
      href: contact.projectId
        ? `/projects/${contact.projectId}`
        : `/search?q=${encodeURIComponent(contact.name)}`,
      updatedAt: contact.updatedAt,
      createdAt: contact.createdAt,
    })),
  };
}
