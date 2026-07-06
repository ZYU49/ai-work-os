import { describe, expect, it, vi } from "vitest";
import { recordActivity } from "./activity";

describe("recordActivity", () => {
  it("stores title and description in metadata with additional metadata", async () => {
    const create = vi.fn().mockResolvedValue({ id: "activity-1" });
    const client = { activityLog: { create } };

    await recordActivity(
      {
        entityType: "Project",
        entityId: "project-1",
        action: "project.created",
        title: "Project created",
        description: "Acme workspace opened",
        projectId: "project-1",
        metadata: { source: "test" },
      },
      client,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        action: "project.created",
        entityType: "Project",
        entityId: "project-1",
        projectId: "project-1",
        metadata: {
          title: "Project created",
          description: "Acme workspace opened",
          source: "test",
        },
      },
    });
  });

  it("keeps explicit title and description ahead of metadata values", async () => {
    const create = vi.fn().mockResolvedValue({ id: "activity-1" });
    const client = { activityLog: { create } };

    await recordActivity(
      {
        entityType: "Project",
        entityId: "project-1",
        action: "project.updated",
        title: "Explicit title",
        description: "Explicit description",
        metadata: {
          title: "Metadata title",
          description: "Metadata description",
          source: "test",
        },
      },
      client,
    );

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: {
          title: "Explicit title",
          description: "Explicit description",
          source: "test",
        },
      }),
    });
  });
});
