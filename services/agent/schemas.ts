import { z } from "zod";

export const emailAnalysisSchema = z.object({
  oneLineSummary: z.string().describe("Concise business summary of the email."),
  keyPoints: z.array(z.string()).describe("Important facts, decisions, or updates."),
  people: z.array(z.string()).describe("People mentioned or directly involved."),
  customers: z.array(z.string()).describe("Customer or company names mentioned."),
  requiredActions: z.array(z.string()).describe("Concrete next actions."),
  needsReply: z.boolean().describe("Whether Richard should reply."),
  suggestedReply: z.string().describe("A concise suggested reply, or an empty string."),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.string().nullable().describe("ISO date if a due date is implied."),
  suggestedProjectName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type EmailAnalysis = z.infer<typeof emailAnalysisSchema>;
