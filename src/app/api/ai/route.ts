import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { requireAuth } from "@/lib/authorization";
import { aiActionSchema } from "@/lib/validators";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Rate limiting map (in-memory, per-server-instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_AI_REQUESTS_PER_MINUTE = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= MAX_AI_REQUESTS_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

const PROMPTS: Record<string, (text: string, lang?: string) => string> = {
  summarize: (text) =>
    `Summarize the following text concisely. Return only the summary, no extra commentary.\n\nText:\n${text}`,
  continue: (text) =>
    `Continue writing from where the following text leaves off. Maintain the same style, tone, and context. Return only the continuation.\n\nText:\n${text}`,
  improve: (text) =>
    `Improve the following text for clarity, grammar, and readability. Maintain the original meaning. Return only the improved text.\n\nText:\n${text}`,
  translate: (text, lang = "Spanish") =>
    `Translate the following text to ${lang}. Return only the translation.\n\nText:\n${text}`,
  explain: (text) =>
    `Explain the following text in simpler terms. Return only the explanation.\n\nText:\n${text}`,
  outline: (text) =>
    `Create a structured outline based on the following topic or text. Use markdown headers and bullet points. Return only the outline.\n\nTopic/Text:\n${text}`,
  "fix-grammar": (text) =>
    `Fix all grammar and spelling errors in the following text. Maintain the original meaning. Return only the corrected text.\n\nText:\n${text}`,
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = requireAuth(session);

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = aiActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { action, text, language } = parsed.data;

    // Check if AI is configured
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "AI is not configured. Add OPENROUTER_API_KEY to enable AI features." },
        { status: 503 }
      );
    }

    const promptFn = PROMPTS[action];
    if (!promptFn) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const prompt = promptFn(text, language);

    const { text: result } = await generateText({
      model: openrouter("openai/gpt-4o-mini"),
      prompt,
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("POST /api/ai error:", error);
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "AI request failed. Please try again." },
      { status: 500 }
    );
  }
}
