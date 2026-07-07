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
      "getSalesAnalytics",
    ]);
  });

  it("includes a sales analytics summary in all-scope context", async () => {
    const tools = {
      getTodayOverview: vi.fn().mockResolvedValue({
        todayTasks: [],
        todayEmails: [],
        todayFiles: [],
        todayActivities: [],
        recentProjects: [],
        openFollowUps: [],
      }),
      getDueTasks: vi.fn().mockResolvedValue([]),
      getOpenFollowUps: vi.fn().mockResolvedValue([]),
      searchProjects: vi.fn().mockResolvedValue([]),
      searchEmails: vi.fn().mockResolvedValue([]),
      getSalesAnalytics: vi.fn().mockResolvedValue({
        kpis: {
          ytdQuantity: 711090,
          ytdRevenue: 21365036,
          averageUnitPrice: 30.04,
          activeCustomers: 27,
        },
        monthly: [],
        topCustomers: [{ name: "TRACTOR SUPPLY COMPANY", quantity: 375957, revenue: 0 }],
        topCategories: [{ name: "L&G Tires", quantity: 164237, revenue: 0 }],
        topSkus: [{ name: "WD1030", quantity: 23571, revenue: 0 }],
        salespeople: [
          { name: "Bella Cui", quantity: 500000, revenue: 0 },
          { name: "Allen Meng", quantity: 200000, revenue: 0 },
        ],
        states: [],
        filterOptions: {
          years: [],
          salespeople: [],
          customers: [],
          categories: [],
          skus: [],
          states: [],
          members: [],
        },
      }),
    };

    const context = await buildAgentContext(
      { message: "sales snapshot", scope: "all" },
      tools,
    );

    expect(context.text).toContain("Sales Analytics");
    expect(context.text).toContain("YTD Quantity: 711,090");
    expect(context.text).toContain("Top Customer: TRACTOR SUPPLY COMPANY");
    expect(tools.getSalesAnalytics).toHaveBeenCalledWith({
      year: new Date().getFullYear(),
    });
  });
});
