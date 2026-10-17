"use client";

import type { RunLogEntry } from "@/lib/types";

const TONE: Record<RunLogEntry["tone"], string> = {
  info: "bg-[#E9E1FF] text-[#2A1670] dark:bg-[#2b2160] dark:text-[#f2edff]",
  ok: "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200",
  warn: "bg-[#FFC83D]/30 text-[#7a5b00] dark:bg-[#FFC83D]/20 dark:text-[#FFC83D]",
  err: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  ai: "bg-[#FF6B57]/15 text-[#c2432f] dark:bg-[#FF6B57]/20 dark:text-[#ffb3a6]",
};

export default function RunLog({ log }: { log: RunLogEntry[] }) {
  if (log.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-[#5B3CC4]/30 p-5 text-center text-sm text-[#6d6390] dark:text-[#b3a8dd]">
        No runs yet. Type a command, press{" "}
        <span className="font-bold text-[#5B3CC4]">▶ Run</span>, and watch each
        block light up here.
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
      {log.map((e, i) => (
        <li
          key={i}
          className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${TONE[e.tone]}`}
        >
          <span className="font-mono opacity-60 mr-2">{e.t}</span>
          <span className="font-extrabold uppercase tracking-wide text-[10px] mr-2">
            {e.node}
          </span>
          {e.message}
        </li>
      ))}
    </ol>
  );
}
