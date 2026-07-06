import { TaskStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createNote, listNotes } from "../../services/notes";
import {
  completeTask,
  createTask,
  listTasks,
  parsePatchTaskBody,
  updateTask,
  updateTaskSchema,
} from "../../services/tasks";

describe("notes service", () => {
  it("builds note filters and includes projects", async () => {
    const client = {
      note: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await listNotes(
      { projectId: "project-1", type: "meeting", query: "pricing" },
      client,
    );

    expect(client.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        include: { project: true },
        where: {
          AND: [
            { projectId: "project-1" },
            { type: "meeting" },
            {
              OR: [
                { title: { contains: "pricing", mode: "insensitive" } },
                { content: { contains: "pricing", mode: "insensitive" } },
              ],
            },
          ],
        },
      }),
    );
  });

  it("creates a note and records activity", async () => {
    const note = {
      id: "note-1",
      projectId: "project-1",
      title: "Call recap",
      content: "Customer asked for ETA.",
      type: "phone_call",
    };
    const tx = {
      note: { create: vi.fn().mockResolvedValue(note) },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await createNote(
      {
        projectId: "project-1",
        title: "Call recap",
        content: "Customer asked for ETA.",
        type: "phone_call",
      },
      client,
    );

    expect(tx.note.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project-1",
          title: "Call recap",
          content: "Customer asked for ETA.",
          type: "phone_call",
        }),
      }),
    );
    expect(tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "note.created",
          entityType: "Note",
          entityId: "note-1",
          projectId: "project-1",
        }),
      }),
    );
  });
});

describe("tasks service", () => {
  it("builds task filters with Chicago date-only boundaries and includes projects", async () => {
    const client = {
      task: { findMany: vi.fn().mockResolvedValue([]) },
    };

    await listTasks(
      {
        projectId: "project-1",
        status: "in_progress",
        priority: "high",
        dueAfter: "2026-07-01",
        dueBefore: "2026-07-31",
        query: "sample",
      },
      client,
    );

    expect(client.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        include: { project: true },
        where: {
          AND: [
            { projectId: "project-1" },
            { status: "in_progress" },
            { priority: "high" },
            {
              dueDate: {
                gte: new Date("2026-07-01T05:00:00.000Z"),
                lt: new Date("2026-08-01T05:00:00.000Z"),
              },
            },
            {
              OR: [
                { title: { contains: "sample", mode: "insensitive" } },
                { description: { contains: "sample", mode: "insensitive" } },
              ],
            },
          ],
        },
      }),
    );
  });

  it("stores date-only due dates at America/Chicago local start", async () => {
    const task = {
      id: "task-1",
      projectId: "project-1",
      title: "Send quote",
      status: TaskStatus.not_started,
      priority: "medium",
    };
    const tx = {
      task: { create: vi.fn().mockResolvedValue(task) },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await createTask(
      {
        projectId: "project-1",
        title: "Send quote",
        dueDate: "2026-07-06",
      },
      client,
    );

    expect(tx.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dueDate: new Date("2026-07-06T05:00:00.000Z"),
        }),
      }),
    );
  });

  it("preserves full datetime due dates", async () => {
    const task = {
      id: "task-1",
      projectId: "project-1",
      title: "Send quote",
      status: TaskStatus.not_started,
      priority: "medium",
    };
    const tx = {
      task: { create: vi.fn().mockResolvedValue(task) },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await createTask(
      {
        projectId: "project-1",
        title: "Send quote",
        dueDate: "2026-07-06T16:30:00.000Z",
      },
      client,
    );

    expect(tx.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dueDate: new Date("2026-07-06T16:30:00.000Z"),
        }),
      }),
    );
  });

  it("sets completedAt when creating completed tasks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00.000Z"));

    const task = {
      id: "task-1",
      projectId: "project-1",
      title: "Send quote",
      status: TaskStatus.completed,
      priority: "medium",
    };
    const tx = {
      task: { create: vi.fn().mockResolvedValue(task) },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await createTask(
      {
        projectId: "project-1",
        title: "Send quote",
        status: "completed",
        priority: "medium",
      },
      client,
    );

    expect(tx.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completedAt: new Date("2026-07-06T12:00:00.000Z"),
        }),
      }),
    );

    vi.useRealTimers();
  });

  it("updates completedAt as tasks move in and out of completed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T13:00:00.000Z"));

    const tx = {
      task: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "task-1",
          status: TaskStatus.not_started,
          completedAt: null,
        }),
        update: vi.fn().mockResolvedValue({
          id: "task-1",
          projectId: "project-1",
          title: "Send quote",
          status: TaskStatus.completed,
        }),
      },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await updateTask("task-1", { status: "completed" }, client);

    expect(tx.task.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "task-1" },
      select: { status: true, completedAt: true },
    });
    expect(tx.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "completed",
          completedAt: new Date("2026-07-06T13:00:00.000Z"),
        }),
      }),
    );

    tx.task.findUniqueOrThrow.mockResolvedValueOnce({
      id: "task-1",
      status: TaskStatus.completed,
      completedAt: new Date("2026-07-06T13:00:00.000Z"),
    });
    await updateTask("task-1", { status: "in_progress" }, client);

    expect(tx.task.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "in_progress",
          completedAt: null,
        }),
      }),
    );

    vi.useRealTimers();
  });

  it("does not inject status or priority defaults into title-only updates", () => {
    expect(updateTaskSchema.parse({ title: "Renamed" })).toEqual({
      title: "Renamed",
    });
  });

  it("updates title without changing status, priority, or completedAt", async () => {
    const tx = {
      task: {
        findUniqueOrThrow: vi.fn(),
        update: vi.fn().mockResolvedValue({
          id: "task-1",
          projectId: "project-1",
          title: "Renamed",
          status: TaskStatus.completed,
          priority: "high",
        }),
      },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await updateTask("task-1", { title: "Renamed" }, client);

    expect(tx.task.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { title: "Renamed" },
      }),
    );
  });

  it("preserves completedAt when completing an already completed task", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T15:00:00.000Z"));

    const existingCompletedAt = new Date("2026-07-05T20:00:00.000Z");
    const tx = {
      task: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          status: TaskStatus.completed,
          completedAt: existingCompletedAt,
        }),
        update: vi.fn().mockResolvedValue({
          id: "task-1",
          projectId: "project-1",
          title: "Send quote",
          status: TaskStatus.completed,
          completedAt: existingCompletedAt,
        }),
      },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await completeTask("task-1", client);

    expect(tx.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "completed",
          completedAt: existingCompletedAt,
        },
      }),
    );

    vi.useRealTimers();
  });

  it("completes a task and records activity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T14:00:00.000Z"));

    const tx = {
      task: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          status: TaskStatus.in_progress,
          completedAt: null,
        }),
        update: vi.fn().mockResolvedValue({
          id: "task-1",
          projectId: "project-1",
          title: "Send quote",
          status: TaskStatus.completed,
        }),
      },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await completeTask("task-1", client);

    expect(tx.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1" },
        data: {
          status: "completed",
          completedAt: new Date("2026-07-06T14:00:00.000Z"),
        },
      }),
    );
    expect(tx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "task.completed",
          entityType: "Task",
          entityId: "task-1",
          projectId: "project-1",
        }),
      }),
    );

    vi.useRealTimers();
  });

  it("rejects unknown update schema fields", () => {
    expect(() =>
      updateTaskSchema.parse({
        title: "Send quote",
        unexpected: true,
      }),
    ).toThrow();
  });

  it("rejects conflicting complete patch bodies and unknown update keys", () => {
    expect(parsePatchTaskBody({ id: "task-1", action: "complete" })).toEqual({
      id: "task-1",
      action: "complete",
    });
    expect(() =>
      parsePatchTaskBody({
        id: "task-1",
        action: "complete",
        status: "completed",
      }),
    ).toThrow();
    expect(() =>
      parsePatchTaskBody({
        id: "task-1",
        title: "Send quote",
        unexpected: true,
      }),
    ).toThrow();
  });
});
