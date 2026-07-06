type EmailPromptInput = {
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  sentAt: Date;
  body: string | null;
  project?: { name: string } | null;
};

export const emailAnalysisSystemPrompt = [
  "You analyze pasted business email for an operator managing tire, customer, logistics, and project work.",
  "Return only the structured analysis fields.",
  "Be concise, action-oriented, and careful with uncertainty.",
  "Suggest replies in a professional, direct style when a reply is useful.",
].join(" ");

export function buildEmailAnalysisPrompt(email: EmailPromptInput) {
  return [
    `Subject: ${email.subject}`,
    `From: ${email.from}`,
    `To: ${email.to.join(", ") || "(none)"}`,
    `Cc: ${email.cc.join(", ") || "(none)"}`,
    `Sent: ${email.sentAt.toISOString()}`,
    `Current project: ${email.project?.name ?? "(none)"}`,
    "",
    "Email body:",
    email.body?.trim() || "(empty)",
  ].join("\n");
}
