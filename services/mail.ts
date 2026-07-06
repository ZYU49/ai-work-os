import { EmailStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { recordActivity } from "../lib/activity";
import { prisma } from "../lib/db";
import type { EmailAnalysis } from "./agent/schemas";

export type ParsedPastedEmail = {
  subject: string;
  fromName: string;
  fromEmail: string;
  fromRaw: string;
  toRaw: string;
  toEmails: string[];
  ccRaw: string;
  ccEmails: string[];
  sentAt: Date;
  bodyText: string;
  pastedRaw: string;
};

export const createEmailFromPasteSchema = z.object({
  raw: z.string().trim().min(1, "Pasted email is required"),
  projectId: z.string().trim().min(1).optional(),
});

export type CreateEmailFromPasteInput = z.infer<
  typeof createEmailFromPasteSchema
>;

const mailListInclude = {
  project: true,
  analysis: true,
} satisfies Prisma.EmailInclude;

const recognizedPasteHeaders = new Set([
  "from",
  "to",
  "cc",
  "bcc",
  "subject",
  "date",
  "sent",
]);

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function parseHeaderBlock(raw: string) {
  const normalized = normalizeLineEndings(raw);
  const lines = normalized.split("\n");
  const headers = new Map<string, string>();
  let currentHeader: string | null = null;
  let bodyStartIndex: number | null = null;
  let hasStartedHeaders = false;

  for (const [index, line] of lines.entries()) {
    if (line.trim() === "" && hasStartedHeaders) {
      bodyStartIndex = index + 1;
      break;
    }

    if (/^[\t ]/.test(line) && currentHeader) {
      headers.set(currentHeader, `${headers.get(currentHeader) ?? ""} ${line.trim()}`);
      continue;
    }

    const match = line.match(/^([^:]+):\s*(.*)$/);
    const headerName = match?.[1].trim().toLowerCase();

    if (match && headerName && recognizedPasteHeaders.has(headerName)) {
      currentHeader = headerName;
      hasStartedHeaders = true;
      headers.set(currentHeader, match[2].trim());
      continue;
    }

    if (hasStartedHeaders) {
      bodyStartIndex = index;
      break;
    }
  }

  const bodyText =
    bodyStartIndex === null ? "" : lines.slice(bodyStartIndex).join("\n");

  return { headers, bodyText: bodyText.trim() };
}

function parseAddress(raw: string) {
  const trimmed = raw.trim();
  const angleMatch = trimmed.match(/^(.*?)<([^>]+)>/);

  if (angleMatch) {
    return {
      name: angleMatch[1].replace(/^"|"$/g, "").trim(),
      email: angleMatch[2].trim(),
    };
  }

  const emailMatch = trimmed.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  return {
    name: emailMatch ? trimmed.replace(emailMatch[0], "").trim() : "",
    email: emailMatch?.[0] ?? "",
  };
}

function parseAddressList(raw: string) {
  return raw
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((part) => parseAddress(part).email)
    .filter(Boolean);
}

function parseSentAt(raw: string | undefined) {
  if (!raw) {
    return new Date();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function parsePastedEmail(raw: string): ParsedPastedEmail {
  const { headers, bodyText } = parseHeaderBlock(raw);
  const fromRaw = headers.get("from") ?? "";
  const toRaw = headers.get("to") ?? "";
  const ccRaw = headers.get("cc") ?? "";
  const from = parseAddress(fromRaw);

  return {
    subject: headers.get("subject")?.trim() || "(No subject)",
    fromName: from.name,
    fromEmail: from.email,
    fromRaw,
    toRaw,
    toEmails: parseAddressList(toRaw),
    ccRaw,
    ccEmails: parseAddressList(ccRaw),
    sentAt: parseSentAt(headers.get("date") ?? headers.get("sent")),
    bodyText,
    pastedRaw: raw,
  };
}

export async function createEmailFromPaste(input: CreateEmailFromPasteInput) {
  const parsed = parsePastedEmail(input.raw);

  return prisma.$transaction(async (tx) => {
    const email = await tx.email.create({
      data: {
        projectId: input.projectId,
        from: parsed.fromEmail || parsed.fromRaw,
        to: parsed.toEmails,
        cc: parsed.ccEmails,
        subject: parsed.subject,
        body: parsed.bodyText,
        sentAt: parsed.sentAt,
      },
      include: mailListInclude,
    });

    await recordActivity(
      {
        projectId: email.projectId ?? undefined,
        action: "email.pasted",
        entityType: "Email",
        entityId: email.id,
        title: "Email pasted",
        description: email.subject,
        metadata: {
          fromRaw: parsed.fromRaw,
          fromName: parsed.fromName,
          fromEmail: parsed.fromEmail,
          toRaw: parsed.toRaw,
          ccRaw: parsed.ccRaw,
        },
      },
      tx,
    );

    return email;
  });
}

export async function listEmails() {
  return prisma.email.findMany({
    take: 50,
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    include: mailListInclude,
  });
}

export async function getEmailById(id: string) {
  return prisma.email.findUnique({
    where: { id },
    include: mailListInclude,
  });
}

export async function saveEmailAnalysis(emailId: string, analysis: EmailAnalysis) {
  return prisma.$transaction(async (tx) => {
    const savedAnalysis = await tx.emailAnalysis.upsert({
      where: { emailId },
      create: {
        emailId,
        summary: analysis.oneLineSummary,
        sentiment: null,
        intent: analysis.needsReply ? "reply_required" : "informational",
        actionItems: analysis.requiredActions,
        metadata: analysis,
      },
      update: {
        summary: analysis.oneLineSummary,
        sentiment: null,
        intent: analysis.needsReply ? "reply_required" : "informational",
        actionItems: analysis.requiredActions,
        metadata: analysis,
      },
    });

    const email = await tx.email.update({
      where: { id: emailId },
      data: { status: EmailStatus.analyzed },
      include: mailListInclude,
    });

    await recordActivity(
      {
        projectId: email.projectId ?? undefined,
        action: "email.analyzed",
        entityType: "Email",
        entityId: email.id,
        title: "Email analyzed",
        description: analysis.oneLineSummary,
        metadata: {
          priority: analysis.priority,
          needsReply: analysis.needsReply,
          confidence: analysis.confidence,
        },
      },
      tx,
    );

    return { email, analysis: savedAnalysis };
  });
}
