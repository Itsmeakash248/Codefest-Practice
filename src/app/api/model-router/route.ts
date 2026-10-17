import { NextRequest, NextResponse } from "next/server";
import { decideWithRouter } from "@/lib/ai";

/** POST /api/model-router { prompt, model? } — OpenRouter with Gemini fallback. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt ?? "").slice(0, 500);
    if (!prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const decision = await decideWithRouter(prompt, body.model);
    return NextResponse.json(decision);
  } catch {
    return NextResponse.json({ error: "router failed" }, { status: 500 });
  }
}
