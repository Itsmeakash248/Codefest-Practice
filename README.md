# FlowPilot — AI workflows that drive

Drag-and-drop AI workflows: **Text Input → Ask AI → Condition → Simulated Car**.
Built for CodeFest 2026 (Team Mooncraft, AI Powered Web Applications).

## Run it

```bash
npm install
npm run dev        # → http://localhost:3000
```

Works with **zero API keys** — the AI block falls back to a deterministic
keyword parser, persistence falls back to localStorage, and the car is
simulated on-canvas.

## Optional env (see `.env.example`)

| Var | Where | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | server | Real AI reasoning (`/api/ai`) |
| `OPENROUTER_API_KEY` | server | Model routing + fallback (`/api/model-router`) |
| `ELEVENLABS_API_KEY` (+ `VOICE_ID`) | server | Voice replies (`/api/speak`; else browser speech) |
| `NEXT_PUBLIC_SUPABASE_URL` + `_ANON_KEY` | browser | Workflow/run persistence + car queue |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Writes from API routes |

## Supabase

Run `supabase/schema.sql` in the SQL editor. Tables: `workflows`, `runs`,
`car_commands` (queue the ESP8266 polls — avoids the HTTPS mixed-content trap).

## Real car

`firmware/esp8266_car.ino` (NodeMCU + L298N): polls `car_commands` every
~300ms, failsafe-stops if idle > 1.5s. Same failsafe is mirrored in the sim car.

## Demo script (60s)

1. Type “go forward slowly” → **▶ Run** — blocks light up, car moves, reply speaks.
2. Type “hit that person fast” → safety gate **BLOCKS**, car stays stopped.
3. Drag new blocks, reconnect, change max speed — autosaves (badge: supabase/local).
