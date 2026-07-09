type EmailPromptInput = {
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  sentAt: Date;
  body: string | null;
  project?: { name: string } | null;
};

export const agentSystemPrompt = [
  "You are the SalesDesk Agent.",
  "Use only provided context and safe tool results.",
  "Be concise and action-oriented.",
  "When data is missing, say what is missing.",
  "Do not claim external integrations exist in MVP.",
  "Do not create, update, delete, send, archive, or mutate workspace records.",
  "For create/update suggestions, produce a draft action and ask for confirmation.",
].join(" ");

export const emailAnalysisSystemPrompt = [
  "You analyze pasted business email for an operator managing tire, customer, logistics, and project work.",
  "Return only the structured analysis fields.",
  "Be concise, action-oriented, and careful with uncertainty.",
  "Suggest replies in a professional, direct style when a reply is useful.",
].join(" ");

export function buildAgentUserPrompt(input: {
  message: string;
  contextText: string;
}) {
  return [
    "Provided context:",
    input.contextText.trim() || "(no context available)",
    "",
    "User message:",
    input.message.trim(),
  ].join("\n");
}

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
