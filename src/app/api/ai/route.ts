import { NextRequest, NextResponse } from "next/server";
import { decideWithGemini } from "@/lib/ai";

/** POST /api/ai { prompt } → validated AIDecision. Keys stay server-side. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt ?? "").slice(0, 500);
    if (!prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const decision = await decideWithGemini(prompt);
    return NextResponse.json(decision);
  } catch {
    return NextResponse.json({ error: "ai failed" }, { status: 500 });
  }
}
