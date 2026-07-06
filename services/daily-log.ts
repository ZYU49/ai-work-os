import type { Prisma } from "@prisma/client";
import { getDayRange, toDateKey } from "../lib/dates";
import { prisma } from "../lib/db";

const projectSummarySelect = {
  id: true,
  name: true,
  companyName: true,
} satisfies Prisma.ProjectSelect;

const dailyEmailInclude = {
  project: { select: projectSummarySelect },
  contact: { select: { id: true, name: true, company: true } },
} satisfies Prisma.EmailInclude;

const dailyTaskInclude = {
  project: { select: projectSummarySelect },
} satisfies Prisma.TaskInclude;

const dailyFileInclude = {
  project: { select: projectSummarySelect },
} satisfies Prisma.FileAssetInclude;

const dailyNoteInclude = {
  project: { select: projectSummarySelect },
} satisfies Prisma.NoteInclude;

const dailyActivityInclude = {
  project: { select: projectSummarySelect },
} satisfies Prisma.ActivityLogInclude;

export type DailyLogEmail = Prisma.EmailGetPayload<{
  include: typeof dailyEmailInclude;
}>;
export type DailyLogTask = Prisma.TaskGetPayload<{
  include: typeof dailyTaskInclude;
}>;
export type DailyLogFile = Prisma.FileAssetGetPayload<{
  include: typeof dailyFileInclude;
}>;
export type DailyLogNote = Prisma.NoteGetPayload<{
  include: typeof dailyNoteInclude;
}>;
export type DailyLogActivity = Prisma.ActivityLogGetPayload<{
  include: typeof dailyActivityInclude;
}>;
export type ExistingDailyLog = Prisma.DailyLogGetPayload<object>;

export type DailyLogContext = {
  dateKey: string;
  range: { start: Date; end: Date };
  emails: DailyLogEmail[];
  tasks: DailyLogTask[];
  files: DailyLogFile[];
  notes: DailyLogNote[];
  activities: DailyLogActivity[];
  existingLog: ExistingDailyLog | null;
};

type DailyLogClient = {
  email: {
    findMany(args: Prisma.EmailFindManyArgs): Promise<DailyLogEmail[]>;
  };
  task: {
    findMany(args: Prisma.TaskFindManyArgs): Promise<DailyLogTask[]>;
  };
  fileAsset: {
    findMany(args: Prisma.FileAssetFindManyArgs): Promise<DailyLogFile[]>;
  };
  note: {
    findMany(args: Prisma.NoteFindManyArgs): Promise<DailyLogNote[]>;
  };
  activityLog: {
    findMany(args: Prisma.ActivityLogFindManyArgs): Promise<DailyLogActivity[]>;
  };
  dailyLog: {
    findFirst(args: Prisma.DailyLogFindFirstArgs): Promise<ExistingDailyLog | null>;
    upsert(args: Prisma.DailyLogUpsertArgs): Promise<ExistingDailyLog>;
  };
};

function rangeFilter(range: { start: Date; end: Date }) {
  return { gte: range.start, lt: range.end };
}

function compactTitles(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);
}

function plural(count: number, singular: string, pluralName = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralName}`;
}

function readableList(parts: string[]) {
  if (parts.length <= 1) {
    return parts.join("");
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function buildSummary(context: DailyLogContext) {
  const counts = {
    emails: context.emails.length,
    tasks: context.tasks.length,
    files: context.files.length,
    notes: context.notes.length,
    activities: context.activities.length,
  };
  const base = readableList([
    plural(counts.emails, "email"),
    plural(counts.tasks, "task"),
    plural(counts.files, "file"),
    plural(counts.notes, "note"),
    plural(counts.activities, "activity", "activities"),
  ]);
  const titles = compactTitles([
    ...context.emails.map((email) => email.subject),
    ...context.tasks.map((task) => task.title),
    ...context.files.map((file) => file.filename),
    ...context.notes.map((note) => note.title ?? note.content),
    ...context.activities.map((activity) => activity.action),
  ]);

  if (titles.length === 0) {
    return `${base}. No standout activity titles captured.`;
  }

  return `${base}. Highlights: ${titles.join("; ")}.`;
}

function buildMetadata(context: DailyLogContext): Prisma.InputJsonObject {
  return {
    dateKey: context.dateKey,
    range: {
      start: context.range.start.toISOString(),
      end: context.range.end.toISOString(),
    },
    counts: {
      emails: context.emails.length,
      tasks: context.tasks.length,
      files: context.files.length,
      notes: context.notes.length,
      activities: context.activities.length,
    },
    ids: {
      emails: context.emails.map((email) => email.id),
      tasks: context.tasks.map((task) => task.id),
      files: context.files.map((file) => file.id),
      notes: context.notes.map((note) => note.id),
      activities: context.activities.map((activity) => activity.id),
    },
    highlights: {
      emails: compactTitles(context.emails.map((email) => email.subject)),
      tasks: compactTitles(context.tasks.map((task) => task.title)),
      files: compactTitles(context.files.map((file) => file.filename)),
      notes: compactTitles(
        context.notes.map((note) => note.title ?? note.content),
      ),
      activities: compactTitles(
        context.activities.map((activity) => activity.action),
      ),
    },
  };
}

export async function getDailyLogContext(
  date: Date,
  client: DailyLogClient = prisma as unknown as DailyLogClient,
): Promise<DailyLogContext> {
  const dateKey = toDateKey(date);
  const range = getDayRange(date);
  const selectedDay = rangeFilter(range);

  const [emails, tasks, files, notes, activities, existingLog] = await Promise.all([
    client.email.findMany({
      take: 25,
      where: { sentAt: selectedDay },
      orderBy: [{ sentAt: "desc" }, { updatedAt: "desc" }],
      include: dailyEmailInclude,
    }),
    client.task.findMany({
      take: 25,
      where: {
        OR: [
          { createdAt: selectedDay },
          { updatedAt: selectedDay },
          { dueDate: selectedDay },
          { completedAt: selectedDay },
        ],
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: dailyTaskInclude,
    }),
    client.fileAsset.findMany({
      take: 25,
      where: { createdAt: selectedDay },
      orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      include: dailyFileInclude,
    }),
    client.note.findMany({
      take: 25,
      where: { createdAt: selectedDay },
      orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      include: dailyNoteInclude,
    }),
    client.activityLog.findMany({
      take: 25,
      where: { createdAt: selectedDay },
      orderBy: { createdAt: "desc" },
      include: dailyActivityInclude,
    }),
    client.dailyLog.findFirst({
      where: { date: selectedDay },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return { dateKey, range, emails, tasks, files, notes, activities, existingLog };
}

export async function generateDailyLog(
  date: Date,
  client: DailyLogClient = prisma as unknown as DailyLogClient,
) {
  const context = await getDailyLogContext(date, client);
  const data = {
    date: context.range.start,
    summary: buildSummary(context),
    metadata: buildMetadata(context),
  } satisfies Prisma.DailyLogUncheckedCreateInput;

  const log = await client.dailyLog.upsert({
    where: { date: context.range.start },
    create: data,
    update: data,
  });

  return { log, context };
}
