import { ContextTurn, Persona, StudentProfile, UntangleResponse } from "./types";

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessage {
  content: AnthropicContentBlock[];
}

export interface AskImage {
  base64: string;
  mediaType: string;
}

export interface AskOptions {
  history?: ContextTurn[];
  persona?: Persona;
  profile?: StudentProfile | null;
  image?: AskImage | null;
}

export async function askClaude(question: string, options: AskOptions = {}): Promise<UntangleResponse> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      history: options.history || [],
      persona: options.persona || "counselor",
      profile: options.profile || null,
      image: options.image || null,
    }),
  });

  if (!response.ok) {
    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      // ignore — we'll fall back to the status code alone
    }
    console.error("[Untangle] /api/ask returned an error:", response.status, bodyText);
    throw new Error(
      `API request failed (${response.status}). ${
        response.status === 404
          ? "This usually means /api routes aren't running — use `vercel dev` locally, or check the deployed URL."
          : "See the browser console and Vercel function logs for details."
      }`
    );
  }

  const data: AnthropicMessage = await response.json();
  const text = (data.content || [])
    .map((block) => block.text || "")
    .join("")
    .replace(/```json|```/g, "")
    .trim();

  try {
    return JSON.parse(text) as UntangleResponse;
  } catch (err) {
    console.error("[Untangle] Failed to parse Claude's response as JSON:", text);
    throw new Error("Claude's response wasn't valid JSON — see console for the raw text.");
  }
}
