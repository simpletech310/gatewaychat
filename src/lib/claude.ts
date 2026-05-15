import Anthropic from "@anthropic-ai/sdk";

// Cheapest current Claude — Haiku 4.5.
export const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

let _client: Anthropic | null = null;
export function anthropic() {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  _client = new Anthropic({ apiKey: key });
  return _client;
}
