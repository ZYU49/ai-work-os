import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/db";

const DASHBOARD_TIME_ZONE = "America/Chicago";

const projectSummarySelect = {
  id: true,
  name: true,
  companyName: true,
  status: true,
  priority: true,
  lastActivityAt: true,
  createdAt: true,
} satisfies Prisma.ProjectSelect;

export type TodayTask = Prisma.TaskGetPayload<{
  include: { project: { select: typeof projectSummarySelect } };
}>;

export type TodayEmail = Prisma.EmailGetPayload<{
  include: { project: { select: typeof projectSummarySelect } };
}>;

export type TodayFile = Prisma.FileAssetGetPayload<{
  include: { project: { select: typeof projectSummarySelect } };
}>;

export type RecentFile = TodayFile;

export type TodayActivity = Prisma.ActivityLogGetPayload<{
  include: { project: { select: typeof projectSummarySelect } };
}>;

export type RecentProject = Prisma.ProjectGetPayload<{
  include: {
    tasks: { select: { id: true } };
    followUps: { select: { id: true } };
  };
}>;

export type OpenFollowUp = Prisma.FollowUpGetPayload<{
  include: {
    project: { select: typeof projectSummarySelect };
    contact: { select: { id: true; name: true; company: true } };
  };
}>;

type DashboardClient = {
  task: {
    findMany(args: Prisma.TaskFindManyArgs): Promise<TodayTask[]>;
  };
  email: {
    findMany(args: Prisma.EmailFindManyArgs): Promise<TodayEmail[]>;
  };
  fileAsset: {
    findMany(args: Prisma.FileAssetFindManyArgs): Promise<TodayFile[]>;
  };
  activityLog: {
    findMany(args: Prisma.ActivityLogFindManyArgs): Promise<TodayActivity[]>;
  };
  project: {
    findMany(args: Prisma.ProjectFindManyArgs): Promise<RecentProject[]>;
  };
  followUp: {
    findMany(args: Prisma.FollowUpFindManyArgs): Promise<OpenFollowUp[]>;
  };
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

export type DashboardOverview = {
  todayTasks: TodayTask[];
  todayEmails: TodayEmail[];
  todayFiles: TodayFile[];
  recentFiles: RecentFile[];
  todayActivities: TodayActivity[];
  recentProjects: RecentProject[];
  openFollowUps: OpenFollowUp[];
};

function getTodayRange(now = new Date()) {
  const localToday = getTimeZoneParts(now, DASHBOARD_TIME_ZONE);
  const start = localMidnightToUtcDate(
    localToday.year,
    localToday.month,
    localToday.day,
    DASHBOARD_TIME_ZONE,
  );
  const nextLocalDay = new Date(
    Date.UTC(localToday.year, localToday.month - 1, localToday.day + 1),
  );
  const endLocalDay = getTimeZoneParts(nextLocalDay, "UTC");
  const end = localMidnightToUtcDate(
    endLocalDay.year,
    endLocalDay.month,
    endLocalDay.day,
    DASHBOARD_TIME_ZONE,
  );

  return { start, end };
}

export async function getDashboardOverview(
  client: DashboardClient = prisma as unknown as DashboardClient,
): Promise<DashboardOverview> {
  const { start, end } = getTodayRange();
  const todayRange = { gte: start, lt: end };

  const [
    todayTasks,
    todayEmails,
    todayFiles,
    recentFiles,
    todayActivities,
    recentProjects,
    openFollowUps,
  ] = await Promise.all([
    client.task.findMany({
      take: 6,
      where: {
        status: { not: "completed" },
        dueDate: todayRange,
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
      include: { project: { select: projectSummarySelect } },
    }),
    client.email.findMany({
      take: 6,
      where: { createdAt: todayRange },
      orderBy: [{ createdAt: "desc" }, { sentAt: "desc" }],
      include: { project: { select: projectSummarySelect } },
    }),
    client.fileAsset.findMany({
      take: 6,
      where: { createdAt: todayRange },
      orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      include: { project: { select: projectSummarySelect } },
    }),
    client.fileAsset.findMany({
      take: 6,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: { project: { select: projectSummarySelect } },
    }),
    client.activityLog.findMany({
      take: 8,
      where: { createdAt: todayRange },
      orderBy: { createdAt: "desc" },
      include: { project: { select: projectSummarySelect } },
    }),
    client.project.findMany({
      take: 6,
      orderBy: [
        { lastActivityAt: { sort: "desc", nulls: "last" } },
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
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
    }),
    client.followUp.findMany({
      take: 6,
      where: { status: "open" },
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } },
        { priority: "desc" },
        { updatedAt: "desc" },
      ],
      include: {
        project: { select: projectSummarySelect },
        contact: { select: { id: true, name: true, company: true } },
      },
    }),
  ]);

  return {
    todayTasks,
    todayEmails,
    todayFiles,
    recentFiles,
    todayActivities,
    recentProjects,
    openFollowUps,
  };
}
