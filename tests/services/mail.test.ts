import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePastedEmail } from "../../services/mail";

describe("parsePastedEmail", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses common pasted email headers and body text", () => {
    const parsed = parsePastedEmail(`From: Jane Smith <jane@example.com>
To: Richard Yu <richard@example.com>
Subject: Mid-States PO update
Date: July 6, 2026 9:00 AM

Can you confirm the latest PO status?`);

    expect(parsed.subject).toBe("Mid-States PO update");
    expect(parsed.fromEmail).toBe("jane@example.com");
    expect(parsed.bodyText).toBe("Can you confirm the latest PO status?");
  });

  it("uses Outlook-style Sent header as a sentAt fallback", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-15T12:00:00.000Z"));

    const parsed = parsePastedEmail(`From: Jane Smith <jane@example.com>
To: Richard Yu <richard@example.com>
Subject: Mid-States PO update
Sent: Monday, July 6, 2026 9:00 AM

Can you confirm the latest PO status?`);

    expect(parsed.sentAt.getFullYear()).toBe(2026);
    expect(parsed.sentAt.getMonth()).toBe(6);
    expect(parsed.sentAt.getDate()).toBe(6);
    expect(parsed.sentAt.getFullYear()).not.toBe(2030);
  });

  it("treats the first non-header line after headers as body text", () => {
    const parsed = parsePastedEmail(`From: Jane Smith <jane@example.com>
To: Richard Yu <richard@example.com>
Subject: Mid-States PO update
Can you confirm the latest PO status?
I need to update purchasing today.`);

    expect(parsed.subject).toBe("Mid-States PO update");
    expect(parsed.bodyText).toContain("Can you confirm the latest PO status?");
    expect(parsed.bodyText).toContain("I need to update purchasing today.");
  });
});
