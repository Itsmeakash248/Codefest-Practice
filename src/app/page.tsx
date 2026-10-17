import Link from "next/link";

const CHAIN = [
  { label: "Text In", color: "bg-[#00A38F]", sub: "input" },
  { label: "Ask AI", color: "bg-[#FF6B57]", sub: "think" },
  { label: "Safe?", color: "bg-[#FFC83D] text-[#2A1670]", sub: "logic" },
  { label: "Drive Car", color: "bg-[#5B3CC4]", sub: "action" },
];

const STEPS = [
  { n: "1", t: "Build", d: "Drag blocks on the canvas. The workflow saves to Supabase as JSON." },
  { n: "2", t: "Run", d: "The browser calls an API route, which walks the graph block by block." },
  { n: "3", t: "Think", d: "Server-side calls go to Gemini. No key ever reaches the browser." },
  { n: "4", t: "Check", d: "The safety gate blocks unsafe or over-speed commands." },
  { n: "5", t: "Move", d: "Drive Car writes to the queue; the sim car — or ESP8266 — executes it." },
  { n: "6", t: "Show", d: "Each block lights up live and the reply is spoken aloud." },
];

const BLOCKS = [
  { t: "Text Input", c: "#00A38F", d: "Typed command or preset button.", tag: "Built-in · live" },
  { t: "Ask AI", c: "#FF6B57", d: "Understands the command, returns structured JSON.", tag: "Gemini · live" },
  { t: "Condition", c: "#FFC83D", d: "Safety gate: safe flag + max-speed limit.", tag: "Built-in · live" },
  { t: "Drive Car", c: "#5B3CC4", d: "Sim car now, real RC car via Supabase queue.", tag: "Supabase · live" },
  { t: "Voice In", c: "#00A38F", d: "Microphone → text via the browser.", tag: "Ready" },
  { t: "Model Router", c: "#FF6B57", d: "Picks or falls back between models.", tag: "OpenRouter · ready" },
  { t: "Speak", c: "#00A38F", d: "Reads the AI reply aloud.", tag: "ElevenLabs · ready" },
  { t: "Save & Share", c: "#5B3CC4", d: "Workflows + run history in Postgres.", tag: "Supabase · live" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-10">
      {/* Hero */}
      <section className="mt-6 rounded-[2rem] bg-[#2A1670] text-white p-8 sm:p-12 overflow-hidden relative">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#5B3CC4]" />
        <div className="absolute -right-8 top-24 h-32 w-32 rounded-full bg-[#FF6B57]" />
        <div className="absolute right-40 -bottom-16 h-40 w-40 rounded-full bg-[#00A38F]" />
        <div className="relative">
          <span className="text-[11px] font-extrabold uppercase tracking-widest bg-white/15 px-3 py-1.5 rounded-full">
            AI Powered Web Applications · CodeFest 2026
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-black leading-[1.05]">
            Drag blocks. Ask AI.
            <br />
            <span className="text-[#FFC83D]">Watch it drive.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] opacity-85 leading-relaxed">
            A visual canvas where anyone builds AI workflows — type “go forward
            slowly”, Gemini returns structured JSON, the safety gate checks it,
            and the car moves. Zero keys needed for the demo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/studio"
              className="rounded-full bg-white text-[#2A1670] font-display font-extrabold px-7 py-3.5 shadow-lg hover:scale-[1.03] active:scale-95 transition"
            >
              ▶ Open Studio
            </Link>
            <Link
              href="/guide"
              className="rounded-full border-2 border-white/40 font-display font-extrabold px-7 py-3.5 hover:bg-white/10 transition"
            >
              Setup guide
            </Link>
          </div>
          {/* chain visual */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {CHAIN.map((b, i) => (
              <div key={b.label} className="flex items-center gap-2">
                <div className={`rounded-2xl px-4 py-2.5 text-sm font-extrabold text-white ${b.color}`}>
                  <div className="text-[9px] uppercase tracking-widest opacity-70">{b.sub}</div>
                  {b.label}
                </div>
                {i < CHAIN.length - 1 && <span className="opacity-60">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How a run flows */}
      <section className="mt-8">
        <h2 className="font-display text-2xl font-black">How a run flows</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-3xl bg-white dark:bg-[#1e1545] p-5 shadow-[0_8px_30px_rgba(42,22,112,0.12)]"
            >
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full bg-[#5B3CC4] text-white grid place-items-center font-black text-sm">
                  {s.n}
                </span>
                <span className="font-display font-extrabold">{s.t}</span>
              </div>
              <p className="mt-2 text-sm text-[#6d6390] dark:text-[#b3a8dd] leading-relaxed">
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Block library */}
      <section className="mt-8">
        <h2 className="font-display text-2xl font-black">Block library</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BLOCKS.map((b) => (
            <div
              key={b.t}
              className="rounded-3xl bg-white dark:bg-[#1e1545] overflow-hidden shadow-[0_8px_30px_rgba(42,22,112,0.12)]"
            >
              <div className="h-2" style={{ background: b.c }} />
              <div className="p-4">
                <div className="font-display font-extrabold">{b.t}</div>
                <p className="mt-1 text-[13px] text-[#6d6390] dark:text-[#b3a8dd] leading-relaxed">
                  {b.d}
                </p>
                <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-widest bg-[#E9E1FF] dark:bg-[#2b2160] px-2 py-1 rounded-full">
                  {b.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="mt-8 rounded-[2rem] bg-[#E9E1FF] dark:bg-[#1e1545] p-6 sm:p-8 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <h2 className="font-display text-2xl font-black">Under the hood</h2>
          <p className="mt-1 text-sm text-[#6d6390] dark:text-[#b3a8dd]">
            Next.js App Router + React Flow on the frontend, server-side API
            routes for every key, Supabase for persistence and the car queue,
            ESP8266 firmware with a 1.5s failsafe.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {["Next.js", "Gemini", "OpenRouter", "ElevenLabs", "Supabase", "React Flow", "ESP8266"].map((t) => (
            <span key={t} className="bg-white dark:bg-[#2b2160] px-3.5 py-2 rounded-full shadow-sm">
              {t}
            </span>
          ))}
        </div>
      </section>

      <footer className="mt-8 text-center text-xs text-[#6d6390] dark:text-[#b3a8dd]">
        FlowPilot · Team Mooncraft · Think Innovatively. Build Creatively. Make an Impact.
      </footer>
    </main>
  );
}
