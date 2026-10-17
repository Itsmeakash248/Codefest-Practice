import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/speak { text } — ElevenLabs TTS when configured.
 * The UI falls back to browser speechSynthesis, so voice works with no key.
 */
export async function POST(req: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY;
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body.text ?? "").slice(0, 280);
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
    if (!key) return NextResponse.json({ ok: false, fallback: "browser" });
    const voice = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": key,
        },
        body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
      },
    );
    if (!res.ok) return NextResponse.json({ ok: false, fallback: "browser" });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch {
    return NextResponse.json({ ok: false, fallback: "browser" });
  }
}
