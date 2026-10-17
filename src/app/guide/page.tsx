const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1 · Supabase setup (5 min)",
    body: (
      <ol className="list-decimal ml-5 flex flex-col gap-1.5 text-sm leading-relaxed">
        <li>Create a free project at supabase.com.</li>
        <li>
          Open the SQL editor and run <code className="font-mono text-xs bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">supabase/schema.sql</code> from
          this repo — it creates <code className="font-mono text-xs">workflows</code>,{" "}
          <code className="font-mono text-xs">runs</code> and{" "}
          <code className="font-mono text-xs">car_commands</code> with least-privilege
          row-level security.
        </li>
        <li>
          Copy the project URL + <strong>anon</strong> key into{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </li>
        <li>
          The Studio badge flips from “local save” to “supabase” — no code
          changes needed.
        </li>
      </ol>
    ),
  },
  {
    title: "2 · Environment variables",
    body: (
      <div className="text-sm">
        <p className="text-[#6d6390] dark:text-[#b3a8dd]">
          Copy <code className="font-mono text-xs">.env.example</code> to{" "}
          <code className="font-mono text-xs">.env.local</code>. Only{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_*</code> reach the
          browser; everything else stays in API routes.
        </p>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full text-xs">
            <tbody>
              {[
                ["GEMINI_API_KEY", "Real AI reasoning in /api/ai"],
                ["OPENROUTER_API_KEY", "Model routing + fallback (optional)"],
                ["ELEVENLABS_API_KEY", "Voice replies (else browser speech)"],
                ["SUPABASE_SERVICE_ROLE_KEY", "Server-side writes (optional)"],
              ].map(([k, v]) => (
                <tr key={k} className="border-t border-black/10 dark:border-white/10 first:border-0">
                  <td className="font-mono px-3 py-2 font-bold whitespace-nowrap">{k}</td>
                  <td className="px-3 py-2">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    title: "3 · Real RC car (ESP8266 + L298N)",
    body: (
      <ol className="list-decimal ml-5 flex flex-col gap-1.5 text-sm leading-relaxed">
        <li>Wire motors → L298N → NodeMCU (see pin map in <code className="font-mono text-xs">firmware/esp8266_car.ino</code>).</li>
        <li>Use a <strong>separate battery pack</strong> for motors + common ground with the ESP.</li>
        <li>Fill in hotspot credentials + Supabase URL/anon key, flash via Arduino IDE.</li>
        <li>
          The car polls <code className="font-mono text-xs">car_commands</code> every ~300ms —
          never call it from the browser (HTTPS mixed-content block).
        </li>
        <li>Failsafe: stops itself if idle &gt; 1.5s. Test on a phone hotspot, not campus Wi-Fi.</li>
      </ol>
    ),
  },
  {
    title: "4 · Demo script (60 seconds)",
    body: (
      <ol className="list-decimal ml-5 flex flex-col gap-1.5 text-sm leading-relaxed">
        <li>“What if anyone could program AI by dragging blocks?”</li>
        <li>Type <em>go forward slowly</em> → Run: blocks light up, car moves, reply speaks.</li>
        <li>Type <em>hit that person fast</em> → Run: safety gate BLOCKS, car stays stopped.</li>
        <li>Under the hood: Next.js + Supabase queue + Gemini + ESP8266. Keep a recorded backup video.</li>
      </ol>
    ),
  },
  {
    title: "5 · Troubleshooting",
    body: (
      <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full text-xs">
          <tbody>
            {[
              ["Car never moves", "Browser can't call http:// car IP (mixed content). Use the Supabase queue."],
              ["Laggy AI", "Rate limits — OpenRouter fallback + cached rules parser cover it."],
              ["No Supabase", "App degrades to localStorage — badge shows “local save”. Demo survives."],
              ["Dead battery", "Simulated car in Studio runs the identical workflow."],
            ].map(([k, v]) => (
              <tr key={k} className="border-t border-black/10 dark:border-white/10 first:border-0">
                <td className="px-3 py-2 font-bold whitespace-nowrap">{k}</td>
                <td className="px-3 py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
];

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-[860px] px-4 py-6 pb-12">
      <h1 className="font-display text-3xl font-black">Setup guide</h1>
      <p className="mt-1 text-sm text-[#6d6390] dark:text-[#b3a8dd]">
        From zero to a moving car: database, keys, hardware, demo script.
      </p>
      <div className="mt-5 flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <section
            key={s.title}
            className="rounded-3xl bg-white dark:bg-[#1e1545] p-5 sm:p-6 shadow-[0_8px_30px_rgba(42,22,112,0.12)]"
          >
            <h2 className="font-display text-lg font-extrabold">{s.title}</h2>
            <div className="mt-2">{s.body}</div>
          </section>
        ))}
      </div>
    </main>
  );
}
