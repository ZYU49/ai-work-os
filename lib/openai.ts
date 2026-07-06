import OpenAI from "openai";

let client: OpenAI | null = null;

export class OpenAIConfigurationError extends Error {
  constructor(message = "OPENAI_API_KEY is not configured.") {
    super(message);
    this.name = "OpenAIConfigurationError";
  }
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new OpenAIConfigurationError(
      "OPENAI_API_KEY is required to analyze email with AI.",
    );
  }

  client ??= new OpenAI({ apiKey });
  return client;
}
