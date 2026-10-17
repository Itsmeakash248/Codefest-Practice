import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

/**
 * POST /api/car-command { command: F|B|L|R|S, speed }
 * Writes to the car_commands queue the ESP8266 polls (every ~300ms).
 * Always succeeds locally so the simulated car + demo never break.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const command = String(body.command ?? "S").toUpperCase();
    const speed = Math.max(0, Math.min(255, Number(body.speed ?? 0) || 0));
    if (!["F", "B", "L", "R", "S"].includes(command)) {
      return NextResponse.json({ error: "bad command" }, { status: 400 });
    }
    const sb = supabaseServer();
    if (sb) {
      const { error } = await sb
        .from("car_commands")
        .insert({ command, speed, status: "pending" });
      if (!error) return NextResponse.json({ ok: true, store: "supabase" });
    }
    return NextResponse.json({ ok: true, store: "local" });
  } catch {
    return NextResponse.json({ error: "queue failed" }, { status: 500 });
  }
}
