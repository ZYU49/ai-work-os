import { describe, expect, it, vi } from "vitest";
import { getDashboardOverview } from "./dashboard";

describe("getDashboardOverview", () => {
  it("queries today's work ranges and limited dashboard collections", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T15:30:00.000Z"));

    const client = {
      task: { findMany: vi.fn().mockResolvedValue([]) },
      email: { findMany: vi.fn().mockResolvedValue([]) },
      fileAsset: { findMany: vi.fn().mockResolvedValue([]) },
      activityLog: { findMany: vi.fn().mockResolvedValue([]) },
      project: { findMany: vi.fn().mockResolvedValue([]) },
      followUp: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const overview = await getDashboardOverview(client);

    expect(client.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 6,
        where: expect.objectContaining({
          status: { not: "completed" },
          dueDate: {
            gte: new Date("2026-07-06T05:00:00.000Z"),
            lt: new Date("2026-07-07T05:00:00.000Z"),
          },
        }),
      }),
    );
    expect(client.email.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 6,
        where: {
          createdAt: {
            gte: new Date("2026-07-06T05:00:00.000Z"),
            lt: new Date("2026-07-07T05:00:00.000Z"),
          },
        },
      }),
    );
    expect(client.fileAsset.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        take: 6,
        where: {
          createdAt: {
            gte: new Date("2026-07-06T05:00:00.000Z"),
            lt: new Date("2026-07-07T05:00:00.000Z"),
          },
        },
      }),
    );
    expect(client.fileAsset.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        take: 6,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
    );
    expect(client.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 8,
        where: {
          createdAt: {
            gte: new Date("2026-07-06T05:00:00.000Z"),
            lt: new Date("2026-07-07T05:00:00.000Z"),
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(client.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 6,
        orderBy: [
          { lastActivityAt: { sort: "desc", nulls: "last" } },
          { updatedAt: "desc" },
          { createdAt: "desc" },
        ],
      }),
    );
    expect(client.followUp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 6,
        where: { status: "open" },
        orderBy: [
          { dueDate: { sort: "asc", nulls: "last" } },
          { priority: "desc" },
          { updatedAt: "desc" },
        ],
      }),
    );
    expect(overview).toHaveProperty("recentFiles");

    vi.useRealTimers();
  });

  it("uses America/Chicago day boundaries for today's dashboard ranges", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-07T01:00:00.000Z"));

    const client = {
      task: { findMany: vi.fn().mockResolvedValue([]) },
      email: { findMany: vi.fn().mockResolvedValue([]) },
      fileAsset: { findMany: vi.fn().mockResolvedValue([]) },
      activityLog: { findMany: vi.fn().mockResolvedValue([]) },
      project: { findMany: vi.fn().mockResolvedValue([]) },
      followUp: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await getDashboardOverview(client);

    expect(client.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueDate: {
            gte: new Date("2026-07-06T05:00:00.000Z"),
            lt: new Date("2026-07-07T05:00:00.000Z"),
          },
        }),
      }),
    );

    vi.useRealTimers();
  });
});
