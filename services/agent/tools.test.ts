import { describe, expect, it, vi } from "vitest";
import {
  getDueTasks,
  getProjectSummary,
  searchEmails,
  searchProjects,
} from "./tools";

const now = new Date("2026-07-06T15:00:00.000Z");

describe("agent safe tools", () => {
  it("returns compact project summaries without exposing raw Prisma records", async () => {
    const client = {
      project: {
        findFirst: vi.fn().mockResolvedValue({
          id: "project-1",
          name: "Acme Rollout",
          companyName: "Acme",
          description: "North region rollout",
          status: "active",
          priority: "high",
          lastActivityAt: now,
          updatedAt: now,
          tasks: [
            {
              id: "task-1",
              title: "Confirm sizes",
              status: "in_progress",
              priority: "high",
              dueDate: now,
            },
          ],
          followUps: [
            {
              id: "follow-1",
              title: "Buyer reply",
              status: "open",
              priority: "medium",
              dueDate: now,
            },
          ],
          notes: [
            {
              id: "note-1",
              title: "Call notes",
              content: "Buyer wants revised quote.",
              createdAt: now,
            },
          ],
          emails: [
            {
              id: "email-1",
              subject: "Quote request",
              from: "buyer@example.com",
              sentAt: now,
              analysis: { summary: "Needs revised quote" },
            },
          ],
        }),
      },
    };

    const summary = await getProjectSummary("Acme", client);

    expect(client.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { id: "Acme" },
            { name: { contains: "Acme", mode: "insensitive" } },
          ],
        },
      }),
    );
    expect(summary).toEqual({
      id: "project-1",
      name: "Acme Rollout",
      companyName: "Acme",
      description: "North region rollout",
      status: "active",
      priority: "high",
      lastActivityAt: now.toISOString(),
      updatedAt: now.toISOString(),
      openTasks: [
        {
          id: "task-1",
          title: "Confirm sizes",
          status: "in_progress",
          priority: "high",
          dueDate: now.toISOString(),
        },
      ],
      openFollowUps: [
        {
          id: "follow-1",
          title: "Buyer reply",
          status: "open",
          priority: "medium",
          dueDate: now.toISOString(),
        },
      ],
      recentNotes: [
        {
          id: "note-1",
          title: "Call notes",
          excerpt: "Buyer wants revised quote.",
          createdAt: now.toISOString(),
        },
      ],
      recentEmails: [
        {
          id: "email-1",
          subject: "Quote request",
          from: "buyer@example.com",
          sentAt: now.toISOString(),
          summary: "Needs revised quote",
        },
      ],
    });
  });

  it("bounds due task lookahead to a practical window", async () => {
    const client = {
      task: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await getDueTasks(999, client, now);

    const args = client.task.findMany.mock.calls[0][0];
    expect(args.take).toBe(12);
    expect(args.where.dueDate.gte).toEqual(now);
    expect(args.where.dueDate.lte).toEqual(new Date("2026-08-05T15:00:00.000Z"));
  });

  it("searches projects and emails with compact limits", async () => {
    const client = {
      project: { findMany: vi.fn().mockResolvedValue([]) },
      email: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await searchProjects("quote", client);
    await searchEmails("quote", client);

    expect(client.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 8 }),
    );
    expect(client.email.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 8 }),
    );
  });
});
