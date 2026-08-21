import type { VercelRequest, VercelResponse } from "@vercel/node";

// Inlined here (rather than imported from ../src/types) so this serverless
// function has zero dependency on files outside the /api folder — a
// cross-folder import was a likely cause of FUNCTION_INVOCATION_FAILED,
// since Vercel bundles each function somewhat independently.
const SYSTEM_PROMPT_BASE = `You are the reasoning engine behind "Untangle," a tool that turns one confusing college question into ONE clear visual plus guided next steps — not a chat reply.

Given the student's question, do four things:
1. Decide which of these four shapes best fits the question:
- "timeline": the question is about sequencing — what to do first, next, later
- "tree": the question is a fork with 2-4 distinct paths/options that lead to different outcomes
- "scale": the question is a for-vs-against, worth-it-or-not weighing
- "comparison": the question is comparing 2-3 named things side by side (majors, schools, jobs, classes)
2. Generate the content for that shape.
3. Generate one concrete next step and 2-3 genuine follow-up questions.
4. Assess "stakes": how much this specific decision actually matters — "low" (reversible, low-consequence, e.g. which elective), "medium" (meaningfully affects their path but recoverable, e.g. minor choice), or "high" (hard to reverse or high-consequence, e.g. dropping out, changing majors senior year). Be honest and calibrated — most everyday questions are low or medium; reserve "high" for genuinely major, hard-to-reverse decisions.

If earlier turns in this conversation are provided, use them for continuity and personalization (e.g. don't re-ask what they already told you, build on what you already know about their situation) — but always produce one fresh, complete JSON object for the CURRENT question only.

If the current message begins with "Zoom in on:", the student tapped a specific detail from a previous answer and wants to go deeper on JUST that — not a re-explanation of the whole original topic. Treat it as its own focused question, scoped narrowly to that one detail, while still using the surrounding conversation for context.

If the student attached an image of a course list, degree plan, transcript, or requirement sheet, read it carefully and use it as the primary source of truth: identify the actual course names/numbers, infer realistic prerequisite relationships from standard course numbering and naming conventions (e.g. "Calculus I" before "Calculus II", 300-level typically after the matching 200-level intro), and build a "timeline" format response sequencing the fastest realistic path through what's shown — flag with lower confidence anything you're inferring rather than reading directly.

Respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly this schema:
{
  "format": "timeline" | "tree" | "scale" | "comparison",
  "headline": "a short (under 12 words) reframing of their question as a clear statement",
  "summary": "1-2 plain, warm, direct sentences giving the actual takeaway. No hedging, no 'it depends' unless genuinely true.",
  "nodes": [
    {
      "label": "short label, 2-6 words",
      "detail": "one sentence of specific, concrete substance",
      "meta": "see rules below",
      "why": "1 sentence explaining the reasoning behind this node specifically — shown only when the student taps to expand it, so it can go a level deeper than detail"
    }
  ],
  "nextStep": "one concrete, doable-this-week action tied directly to their situation — not generic advice like 'talk to your advisor'",
  "followUps": ["a natural follow-up question", "another angle they might not have considered", "optionally a third"],
  "stakes": "low" | "medium" | "high"
}

Rules for "nodes" by format:
- timeline: 3-5 nodes in order. meta = "Now" | "Next" | "Later" | "Eventually" (pick the right sequencing word per node)
- tree: 2-4 nodes, one per branch/option. meta = a short outcome phrase, e.g. "if you switch now"
- scale: 3-5 nodes total, mixing both sides. meta = exactly "for" or "against"
- comparison: 2-3 nodes = the things being compared. meta = a short verdict phrase for that option; detail = the single most decision-relevant fact about it

Be specific and opinionated, not generic. Avoid corporate-advice tone and avoid "it depends on your priorities" filler. Write like someone giving real guidance, not a search engine summarizing options.`;

const PERSONA_INSTRUCTIONS: Record<string, string> = {
  sibling:
    "Write in the voice of a blunt older sibling who's already been through college — direct, a little irreverent, cuts straight past the corporate-advice tone. Still substantive, just no hedging or fluff.",
  counselor:
    "Write in the voice of a warm, structured career counselor — supportive but still specific and honest, thinking about the student's whole path rather than just this one decision.",
  analyst:
    "Write in the voice of a precise, data-driven analyst — neutral, weighs trade-offs and likely outcomes explicitly, avoids emotional language, favors concrete reasoning over encouragement.",
};

function buildSystemPrompt(persona: string, profile?: { year?: string; focus?: string } | null): string {
  let prompt = SYSTEM_PROMPT_BASE;
  prompt += `\n\nTONE: ${PERSONA_INSTRUCTIONS[persona] || PERSONA_INSTRUCTIONS.counselor}`;
  if (profile && (profile.year || profile.focus)) {
    prompt += `\n\nSTUDENT CONTEXT: This student is ${profile.year ? `a ${profile.year}` : "a student"}${
      profile.focus ? ` focusing on ${profile.focus}` : ""
    }. Use this to make advice concrete and relevant without restating it back at them every time.`;
  }
  return prompt;
}

interface ContextTurnInput {
  question: string;
  response: unknown;
}

interface ImageInput {
  base64: string;
  mediaType: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const { question, history, persona, profile, image } = (req.body || {}) as {
      question?: string;
      history?: ContextTurnInput[];
      persona?: string;
      profile?: { year?: string; focus?: string };
      image?: ImageInput;
    };

    if (!question || typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: "Missing question" });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[Untangle] ANTHROPIC_API_KEY is not set in this environment.");
      res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
      return;
    }

    // Build real multi-turn context: each prior exchange becomes an actual
    // user/assistant turn pair, capped to the last 3 so tokens stay bounded.
    const priorTurns = Array.isArray(history) ? history.slice(-3) : [];

    // Current turn's content — plain text, or text + image if one was attached.
    const currentContent: any = image
      ? [
          { type: "text", text: question },
          {
            type: "image",
            source: { type: "base64", media_type: image.mediaType, data: image.base64 },
          },
        ]
      : question;

    const messages = [
      ...priorTurns.flatMap((turn) => [
        { role: "user" as const, content: turn.question },
        { role: "assistant" as const, content: JSON.stringify(turn.response) },
      ]),
      { role: "user" as const, content: currentContent },
    ];

    const systemPrompt = buildSystemPrompt(persona || "counselor", profile);

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error("[Untangle] Anthropic API returned an error:", upstream.status, data);
      res.status(upstream.status).json(data);
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    // Catch-all so a raw crash never surfaces as Vercel's generic
    // FUNCTION_INVOCATION_FAILED page — we always return real JSON instead.
    console.error("[Untangle] Uncaught error in /api/ask:", err);
    res.status(500).json({
      error: "Upstream request to Claude failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
