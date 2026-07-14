import { describe, expect, it, vi } from "vitest";
import { createKnowledgePage, listKnowledgePages } from "@/services/knowledge";

describe("knowledge service", () => {
  it("builds filters for category, project, tag, and query", async () => {
    const client = {
      knowledgePage: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await listKnowledgePages(
      {
        projectId: "project-1",
        category: "customer",
        tag: "midstate",
        query: "EDI",
      },
      client,
    );

    expect(client.knowledgePage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        include: { project: true },
        where: {
          AND: [
            { projectId: "project-1" },
            { category: "customer" },
            { tags: { has: "midstate" } },
            {
              OR: [
                { title: { contains: "EDI", mode: "insensitive" } },
                { content: { contains: "EDI", mode: "insensitive" } },
                { summary: { contains: "EDI", mode: "insensitive" } },
                { tags: { has: "EDI" } },
              ],
            },
          ],
        },
      }),
    );
  });

  it("creates a knowledge page, normalizes tags, and records activity", async () => {
    const page = {
      id: "knowledge-1",
      projectId: "project-1",
      title: "Midstate monthly process",
      category: "process",
      content: "Upload the monthly member file.",
      tags: ["midstate", "monthly"],
    };
    const tx = {
      knowledgePage: { create: vi.fn().mockResolvedValue(page) },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await createKnowledgePage(
      {
        projectId: "project-1",
        title: "Midstate monthly process",
        category: "process",
        content: "Upload the monthly member file.",
        tags: ["monthly", "midstate", "midstate"],
      },
      client,
    );

    expect(tx.knowledgePage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project-1",
          title: "Midstate monthly process",
          category: "process",
          content: "Upload the monthly member file.",
          tags: ["midstate", "monthly"],
        }),
      }),
    );
    expect(tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "knowledge.created",
          entityType: "KnowledgePage",
          entityId: "knowledge-1",
          projectId: "project-1",
        }),
      }),
    );
  });
});
