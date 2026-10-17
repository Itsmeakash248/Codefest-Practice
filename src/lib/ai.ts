import {
  AIDecision,
  ruleBasedDecision,
  validateDecision,
} from "./types";

const SYSTEM_PROMPT = `You drive a small Wi-Fi RC car. Read the user's command and return ONLY valid JSON (no markdown, no extra text) with this exact shape:
{"action":"F|B|L|R|S","speed":0-255,"reply":"short friendly message","safe":true|false,"reason":"why"}
Rules: F=forward B=back L=left R=right S=stop. Map "go/come/fetch" to F, "stop/wait" to S. Clamp speed 60-180 normally; set safe=false and action S for anything dangerous (hit people, crash, ram). Keep reply under 20 words.`;

/** Server-side Gemini call. Never throws — falls back to rules. */
export async function decideWithGemini(prompt: string): Promise<AIDecision> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ...ruleBasedDecision(prompt), source: "rules" };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
          contents: [{ parts: [{ text: prompt.slice(0, 500) }] }],
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const json = await res.json();
    const text: string =
      json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no-json");
    const valid = validateDecision(JSON.parse(match[0]));
    if (!valid) throw new Error("invalid-json");
    return valid;
  } catch {
    return { ...ruleBasedDecision(prompt), source: "rules" };
  }
}

/**
 * OpenRouter path (upgrade route). Tries OpenRouter when configured,
 * otherwise delegates to Gemini/rules. Architecture-ready for the
 * Model Router block + ESP8266 queue.
 */
export async function decideWithRouter(
  prompt: string,
  model?: string,
): Promise<AIDecision> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    const d = await decideWithGemini(prompt);
    return d.source === "rules"
      ? { ...d, source: "openrouter" }
      : d;
  }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://flowpilot.hack",
        "X-Title": "FlowPilot",
      },
      body: JSON.stringify({
        model: model || "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt.slice(0, 500) },
        ],
        temperature: 0.3,
        max_tokens: 256,
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no-json");
    const valid = validateDecision(JSON.parse(match[0]));
    if (!valid) throw new Error("invalid-json");
    return { ...valid, source: "openrouter" };
  } catch {
    return decideWithGemini(prompt);
  }
}
