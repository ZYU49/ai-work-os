import { describe, expect, it, vi } from "vitest";
import { getDayRange, parseDateKey, toDateKey } from "../../lib/dates";
import { generateDailyLog, getDailyLogContext } from "../../services/daily-log";

describe("date helpers", () => {
  it("uses America/Chicago local days for keys and UTC ranges", () => {
    const lateChicagoEvening = new Date("2026-07-07T01:00:00.000Z");

    expect(toDateKey(lateChicagoEvening)).toBe("2026-07-06");
    expect(getDayRange(lateChicagoEvening)).toEqual({
      start: new Date("2026-07-06T05:00:00.000Z"),
      end: new Date("2026-07-07T05:00:00.000Z"),
    });
  });

  it("rejects invalid calendar date keys instead of rolling over", () => {
    expect(() => parseDateKey("2026-02-31")).toThrow(
      "Date must be a valid calendar date.",
    );
    expect(() => parseDateKey("2026-13-40")).toThrow(
      "Date must be a valid calendar date.",
    );
    expect(() => parseDateKey("2026-00-01")).toThrow(
      "Date must be a valid calendar date.",
    );
  });
});

describe("daily log service", () => {
  it("groups emails, tasks, files, notes, and activity for the selected local day", async () => {
    const client = {
      email: { findMany: vi.fn().mockResolvedValue([{ id: "email-1" }]) },
      task: { findMany: vi.fn().mockResolvedValue([{ id: "task-1" }]) },
      fileAsset: { findMany: vi.fn().mockResolvedValue([{ id: "file-1" }]) },
      note: { findMany: vi.fn().mockResolvedValue([{ id: "note-1" }]) },
      activityLog: { findMany: vi.fn().mockResolvedValue([{ id: "activity-1" }]) },
      dailyLog: { findFirst: vi.fn().mockResolvedValue(null) },
    };

    const context = await getDailyLogContext(
      new Date("2026-07-07T01:00:00.000Z"),
      client,
    );

    const dayRange = {
      gte: new Date("2026-07-06T05:00:00.000Z"),
      lt: new Date("2026-07-07T05:00:00.000Z"),
    };

    expect(context.dateKey).toBe("2026-07-06");
    expect(context.emails).toHaveLength(1);
    expect(context.tasks).toHaveLength(1);
    expect(context.files).toHaveLength(1);
    expect(context.notes).toHaveLength(1);
    expect(context.activities).toHaveLength(1);
    expect(client.email.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sentAt: dayRange } }),
    );
    expect(client.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { createdAt: dayRange },
            { updatedAt: dayRange },
            { dueDate: dayRange },
            { completedAt: dayRange },
          ],
        },
      }),
    );
    expect(client.fileAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: dayRange } }),
    );
    expect(client.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: dayRange } }),
    );
    expect(client.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: dayRange } }),
    );
  });

  it("updates the existing daily log for the local date with deterministic summary metadata", async () => {
    const client = {
      email: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "email-1",
            subject: "Quote request",
            project: { id: "project-1", name: "Acme" },
          },
        ]),
      },
      task: {
        findMany: vi.fn().mockResolvedValue([
          { id: "task-1", title: "Send quote", project: null },
        ]),
      },
      fileAsset: { findMany: vi.fn().mockResolvedValue([]) },
      note: {
        findMany: vi.fn().mockResolvedValue([
          { id: "note-1", title: "Call recap", project: null },
        ]),
      },
      activityLog: {
        findMany: vi.fn().mockResolvedValue([
          { id: "activity-1", action: "project.updated", project: null },
        ]),
      },
      dailyLog: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: "log-1" })
          .mockResolvedValueOnce({ id: "log-1" }),
        upsert: vi.fn().mockResolvedValue({
          id: "log-1",
          date: new Date("2026-07-06T05:00:00.000Z"),
          summary: "1 email, 1 task, 0 files, 1 note, and 1 activity. Highlights: Quote request; Send quote; Call recap.",
        }),
      },
    };

    const { log, context } = await generateDailyLog(
      new Date("2026-07-06T13:00:00.000Z"),
      client,
    );

    expect(context.dateKey).toBe("2026-07-06");
    expect(log.summary).toBe(
      "1 email, 1 task, 0 files, 1 note, and 1 activity. Highlights: Quote request; Send quote; Call recap.",
    );
    expect(client.dailyLog.upsert).toHaveBeenCalledWith({
      where: { date: new Date("2026-07-06T05:00:00.000Z") },
      create: expect.objectContaining({
        date: new Date("2026-07-06T05:00:00.000Z"),
        summary:
          "1 email, 1 task, 0 files, 1 note, and 1 activity. Highlights: Quote request; Send quote; Call recap.",
        metadata: expect.objectContaining({
          dateKey: "2026-07-06",
          counts: {
            emails: 1,
            tasks: 1,
            files: 0,
            notes: 1,
            activities: 1,
          },
          ids: {
            emails: ["email-1"],
            tasks: ["task-1"],
            files: [],
            notes: ["note-1"],
            activities: ["activity-1"],
          },
        }),
      }),
      update: expect.objectContaining({
        date: new Date("2026-07-06T05:00:00.000Z"),
        summary:
          "1 email, 1 task, 0 files, 1 note, and 1 activity. Highlights: Quote request; Send quote; Call recap.",
        metadata: expect.any(Object),
      }),
    });
  });
});
