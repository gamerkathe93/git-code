const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-4-5-20251001";

export async function callClaude(userPrompt: string, systemPrompt = "You are a helpful software engineering assistant. Be concise."): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return "_AI features require `ANTHROPIC_API_KEY` to be set in environment variables._";
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  } catch (err) {
    console.error("[AI] callClaude error:", err);
    return "_AI review unavailable right now._";
  }
}
