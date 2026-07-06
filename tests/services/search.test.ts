import { describe, expect, it, vi } from "vitest";
import { searchAll } from "../../lib/search";

describe("searchAll", () => {
  it("returns empty grouped results for an empty query", async () => {
    const client = {
      project: { findMany: vi.fn() },
      email: { findMany: vi.fn() },
      fileAsset: { findMany: vi.fn() },
      task: { findMany: vi.fn() },
      note: { findMany: vi.fn() },
      dailyLog: { findMany: vi.fn() },
      contact: { findMany: vi.fn() },
    };

    await expect(searchAll("   ", client)).resolves.toEqual({
      projects: [],
      emails: [],
      files: [],
      tasks: [],
      notes: [],
      dailyLogs: [],
      contacts: [],
    });
    expect(client.project.findMany).not.toHaveBeenCalled();
  });

  it("searches and groups basic workspace results", async () => {
    const now = new Date("2026-07-06T16:00:00.000Z");
    const client = {
      project: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "project-1",
            name: "Acme rollout",
            companyName: "Acme",
            description: null,
            updatedAt: now,
          },
        ]),
      },
      email: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "email-1",
            subject: "Acme quote",
            from: "buyer@example.com",
            updatedAt: now,
            sentAt: now,
            project: { name: "Acme rollout" },
          },
        ]),
      },
      fileAsset: { findMany: vi.fn().mockResolvedValue([]) },
      task: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "task-1",
            title: "Prepare Acme quote",
            status: "in_progress",
            priority: "high",
            updatedAt: now,
            project: null,
          },
        ]),
      },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      dailyLog: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "log-1",
            date: new Date("2026-07-06T05:00:00.000Z"),
            summary: "Acme quote activity",
            updatedAt: now,
          },
        ]),
      },
      contact: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "contact-1",
            projectId: null,
            name: "Acme Buyer",
            company: "Acme",
            role: "Purchasing",
            updatedAt: now,
            createdAt: now,
            project: null,
          },
        ]),
      },
    };

    const results = await searchAll("Acme", client);

    expect(client.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 8,
        where: {
          OR: [
            { name: { contains: "Acme", mode: "insensitive" } },
            { companyName: { contains: "Acme", mode: "insensitive" } },
            { description: { contains: "Acme", mode: "insensitive" } },
          ],
        },
      }),
    );
    expect(client.email.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 8,
        where: {
          OR: [
            { subject: { contains: "Acme", mode: "insensitive" } },
            { from: { contains: "Acme", mode: "insensitive" } },
            { body: { contains: "Acme", mode: "insensitive" } },
          ],
        },
      }),
    );
    expect(results.projects[0]).toEqual({
      id: "project-1",
      type: "project",
      title: "Acme rollout",
      subtitle: "Acme",
      href: "/projects/project-1",
      updatedAt: now,
    });
    expect(results.emails[0]).toEqual({
      id: "email-1",
      type: "email",
      title: "Acme quote",
      subtitle: "buyer@example.com - Acme rollout",
      href: "/mail?emailId=email-1",
      updatedAt: now,
      createdAt: now,
    });
    expect(results.tasks[0].href).toBe("/tasks?taskId=task-1");
    expect(results.dailyLogs[0]).toEqual({
      id: "log-1",
      type: "dailyLog",
      title: "Daily Log - 2026-07-06",
      subtitle: "Acme quote activity",
      href: "/daily-log?date=2026-07-06",
      updatedAt: now,
      createdAt: new Date("2026-07-06T05:00:00.000Z"),
    });
    expect(results.contacts[0]).toEqual({
      id: "contact-1",
      type: "contact",
      title: "Acme Buyer",
      subtitle: "Acme - Purchasing",
      href: "/search?q=Acme%20Buyer",
      updatedAt: now,
      createdAt: now,
    });
  });
});
