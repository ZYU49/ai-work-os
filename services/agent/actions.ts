import { zodResponseFormat } from "openai/helpers/zod";
import { OpenAIConfigurationError, getOpenAIClient } from "../../lib/openai";
import {
  emailAnalysisSchema,
  type EmailAnalysis,
} from "./schemas";
import {
  buildEmailAnalysisPrompt,
  emailAnalysisSystemPrompt,
} from "./prompts";

type AnalyzableEmail = {
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  sentAt: Date;
  body: string | null;
  project?: { name: string } | null;
};

export class EmailAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailAnalysisError";
  }
}

export { OpenAIConfigurationError };

export async function analyzeEmailWithAI(
  email: AnalyzableEmail,
): Promise<EmailAnalysis> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-5.5";

  const completion = await client.chat.completions.parse({
    model,
    messages: [
      { role: "system", content: emailAnalysisSystemPrompt },
      { role: "user", content: buildEmailAnalysisPrompt(email) },
    ],
    response_format: zodResponseFormat(emailAnalysisSchema, "email_analysis"),
  });

  const message = completion.choices[0]?.message;

  if (message?.refusal) {
    throw new EmailAnalysisError(`OpenAI refused to analyze the email: ${message.refusal}`);
  }

  if (!message?.parsed) {
    throw new EmailAnalysisError("OpenAI did not return a parseable email analysis.");
  }

  return message.parsed;
}
