import { describe, expect, it, vi } from "vitest";
import { buildAgentContext } from "./context-builder";

describe("buildAgentContext", () => {
  it("builds project scoped context with ids and compact sections", async () => {
    const tools = {
      getProjectSummary: vi.fn().mockResolvedValue({
        id: "project-1",
        name: "Acme Rollout",
        companyName: "Acme",
        status: "active",
        priority: "high",
        openTasks: [{ id: "task-1", title: "Confirm sizes", priority: "high" }],
        openFollowUps: [{ id: "follow-1", title: "Buyer reply" }],
        recentEmails: [{ id: "email-1", subject: "Quote request" }],
        recentNotes: [],
      }),
    };

    const context = await buildAgentContext(
      { message: "what should I do", scope: "project", projectId: "project-1" },
      tools,
    );

    expect(context.text).toContain("Scope: project");
    expect(context.text).toContain("Project project-1: Acme Rollout");
    expect(context.text).toContain("task-1");
    expect(context.summaryLength).toBe(context.text.length);
    expect(context.toolNames).toEqual(["getProjectSummary"]);
  });

  it("keeps all-scope context bounded and records tool names", async () => {
    const tools = {
      getTodayOverview: vi.fn().mockResolvedValue({
        todayTasks: [{ id: "task-1", title: "Today task" }],
        todayEmails: [],
        todayFiles: [],
        todayActivities: [],
        recentProjects: [{ id: "project-1", name: "Acme" }],
        openFollowUps: [],
      }),
      getDueTasks: vi.fn().mockResolvedValue([{ id: "task-2", title: "Due soon" }]),
      getOpenFollowUps: vi.fn().mockResolvedValue([{ id: "follow-1", title: "Reply" }]),
      searchProjects: vi.fn().mockResolvedValue([{ id: "project-2", name: "Search hit" }]),
      searchEmails: vi.fn().mockResolvedValue([{ id: "email-1", subject: "Search email" }]),
    };

    const context = await buildAgentContext(
      { message: "Acme quote status", scope: "all" },
      tools,
    );

    expect(context.text.length).toBeLessThanOrEqual(6000);
    expect(context.toolNames).toEqual([
      "getTodayOverview",
      "getDueTasks",
      "getOpenFollowUps",
      "searchProjects",
      "searchEmails",
    ]);
  });
});
