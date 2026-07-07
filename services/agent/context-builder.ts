import { agentTools, type AgentTools } from "./tools";

import { getMidstateAnalytics } from "@/services/midstate/metrics";

export type AgentScope = "all" | "project" | "today";

export type BuildAgentContextInput = {
  message: string;
  scope: AgentScope;
  projectId?: string;
};

export type BuiltAgentContext = {
  text: string;
  summaryLength: number;
  toolNames: string[];
};

const MAX_CONTEXT_CHARS = 6000;

type AnyRecord = Record<string, unknown>;

function asItems(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.slice(0, 8) as AnyRecord[] : [];
}

function label(record: AnyRecord, fields: string[]) {
  return fields
    .map((field) => record[field])
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" | ");
}

function listSection(title: string, values: unknown, fields: string[]) {
  const items = asItems(values);

  if (items.length === 0) {
    return [`${title}: none`];
  }

  return [
    `${title}:`,
    ...items.map((item) => `- ${item.id ?? "no-id"}: ${label(item, fields)}`),
  ];
}

function projectName(project: unknown) {
  if (!project || typeof project !== "object") {
    return null;
  }

  const name = (project as { name?: unknown }).name;
  return typeof name === "string" ? name : null;
}

function taskLine(task: AnyRecord) {
  const project = projectName(task.project);
  const parts = [
    task.title,
    task.status,
    task.priority,
    task.dueDate ? `due ${task.dueDate}` : null,
    project ? `project ${project}` : null,
  ].filter(Boolean);

  return `- ${task.id ?? "no-id"}: ${parts.join(" | ")}`;
}

function followUpLine(followUp: AnyRecord) {
  const project = projectName(followUp.project);
  const parts = [
    followUp.title,
    followUp.priority,
    followUp.dueDate ? `due ${followUp.dueDate}` : null,
    project ? `project ${project}` : null,
  ].filter(Boolean);

  return `- ${followUp.id ?? "no-id"}: ${parts.join(" | ")}`;
}

function emailLine(email: AnyRecord) {
  const project = projectName(email.project);
  const parts = [
    email.subject,
    email.from ? `from ${email.from}` : null,
    email.summary,
    project ? `project ${project}` : null,
  ].filter(Boolean);

  return `- ${email.id ?? "no-id"}: ${parts.join(" | ")}`;
}

function withLimit(lines: string[]) {
  const text = lines.join("\n");

  if (text.length <= MAX_CONTEXT_CHARS) {
    return text;
  }

  return `${text.slice(0, MAX_CONTEXT_CHARS - 80)}\n[Context truncated to stay within MVP token budget.]`;
}

async function buildSalesAnalyticsContext(tools: Partial<AgentTools>) {
  try {
    const analytics = await tools.getSalesAnalytics?.({
      year: new Date().getFullYear(),
    });

    if (!analytics) {
      return ["Sales Analytics", "Unavailable."];
    }

    return [
      "Sales Analytics",
      `YTD Quantity: ${analytics.kpis.ytdQuantity.toLocaleString()}`,
      `YTD Revenue: ${analytics.kpis.ytdRevenue.toLocaleString()}`,
      `Top Customer: ${analytics.topCustomers[0]?.name ?? "N/A"}`,
      `Top Category: ${analytics.topCategories[0]?.name ?? "N/A"}`,
      `Top SKU: ${analytics.topSkus[0]?.name ?? "N/A"}`,
    ];
  } catch {
    return ["Sales Analytics", "Unavailable."];
  }
}

async function buildMidstateAnalyticsContext() {
  try {
    const midstate = await getMidstateAnalytics({
      year: new Date().getFullYear(),
    });

    return [
      "Midstate Analytics",
      `YTD Sell-through Quantity: ${midstate.kpis.ytdQuantity.toLocaleString()}`,
      `Current Month Quantity: ${midstate.kpis.currentMonthQuantity.toLocaleString()}`,
      `Active Members: ${midstate.kpis.activeMembers.toLocaleString()}`,
      `Top Member: ${midstate.kpis.topMember ?? "N/A"}`,
      `Top SKU: ${midstate.kpis.topSku ?? "N/A"}`,
    ];
  } catch {
    return ["Midstate Analytics", "Unavailable."];
  }
}

async function buildProjectContext(
  input: BuildAgentContextInput,
  tools: Partial<AgentTools>,
) {
  const projectKey = input.projectId || input.message;
  const summary = await tools.getProjectSummary?.(projectKey);
  const lines = [`Scope: project`, `Requested project: ${projectKey}`];

  if (!summary) {
    lines.push("Project context: missing. No matching project was found.");
    return lines;
  }

  lines.push(
    `Project ${summary.id}: ${summary.name}`,
    `Company: ${summary.companyName ?? "missing"}`,
    `Status: ${summary.status}; Priority: ${summary.priority}`,
    `Description: ${summary.description ?? "missing"}`,
    "Open tasks:",
    ...asItems(summary.openTasks).map(taskLine),
    "Open follow-ups:",
    ...asItems(summary.openFollowUps).map(followUpLine),
    "Recent emails:",
    ...asItems(summary.recentEmails).map(emailLine),
    "Recent notes:",
    ...asItems(summary.recentNotes).map(
      (note) => `- ${note.id ?? "no-id"}: ${label(note, ["title", "excerpt"])}`,
    ),
  );

  return lines;
}

async function buildTodayContext(tools: Partial<AgentTools>) {
  const [overview, dailyLog] = await Promise.all([
    tools.getTodayOverview?.(),
    tools.getDailyLogContextForAgent?.(new Date()),
  ]);
  const lines = ["Scope: today"];

  if (!overview) {
    lines.push("Today overview: missing.");
  } else {
    lines.push(
      "Today tasks:",
      ...asItems(overview.todayTasks).map(taskLine),
      "Today emails:",
      ...asItems(overview.todayEmails).map(emailLine),
      "Open follow-ups:",
      ...asItems(overview.openFollowUps).map(followUpLine),
      ...listSection("Recent projects", overview.recentProjects, [
        "name",
        "status",
        "priority",
      ]),
    );
  }

  if (dailyLog) {
    lines.push(
      `Daily log ${dailyLog.dateKey}: ${dailyLog.existingLog?.summary ?? "no generated summary"}`,
      `Counts: ${dailyLog.counts.emails} emails, ${dailyLog.counts.tasks} tasks, ${dailyLog.counts.notes} notes, ${dailyLog.counts.activities} activities`,
    );
  } else {
    lines.push("Daily log context: missing.");
  }

  return lines;
}

async function buildAllContext(input: BuildAgentContextInput, tools: Partial<AgentTools>) {
  const [
    overview,
    dueTasks,
    followUps,
    projectHits,
    emailHits,
    salesAnalytics,
    midstateAnalytics,
  ] = await Promise.all([
    tools.getTodayOverview?.(),
    tools.getDueTasks?.(7),
    tools.getOpenFollowUps?.(),
    tools.searchProjects?.(input.message),
    tools.searchEmails?.(input.message),
    buildSalesAnalyticsContext(tools),
    buildMidstateAnalyticsContext(),
  ]);

  return [
    "Scope: all",
    "Today tasks:",
    ...asItems(overview?.todayTasks).map(taskLine),
    "Recent projects:",
    ...asItems(overview?.recentProjects).map(
      (project) => `- ${project.id ?? "no-id"}: ${label(project, ["name", "status", "priority"])}`,
    ),
    "Due tasks next 7 days:",
    ...asItems(dueTasks).map(taskLine),
    "Open follow-ups:",
    ...asItems(followUps).map(followUpLine),
    "Project search hits:",
    ...asItems(projectHits).map(
      (project) => `- ${project.id ?? "no-id"}: ${label(project, ["name", "companyName", "status"])}`,
    ),
    "Email search hits:",
    ...asItems(emailHits).map(emailLine),
    ...salesAnalytics,
    ...midstateAnalytics,
  ];
}

export async function buildAgentContext(
  input: BuildAgentContextInput,
  tools: Partial<AgentTools> = agentTools,
): Promise<BuiltAgentContext> {
  const toolNames: string[] =
    input.scope === "project"
      ? ["getProjectSummary"]
      : input.scope === "today"
        ? ["getTodayOverview", "getDailyLogContextForAgent"]
        : [
            "getTodayOverview",
            "getDueTasks",
            "getOpenFollowUps",
            "searchProjects",
            "searchEmails",
            "getSalesAnalytics",
          ];

  const lines =
    input.scope === "project"
      ? await buildProjectContext(input, tools)
      : input.scope === "today"
        ? await buildTodayContext(tools)
        : await buildAllContext(input, tools);
  const text = withLimit(lines);

  return {
    text,
    summaryLength: text.length,
    toolNames,
  };
}
