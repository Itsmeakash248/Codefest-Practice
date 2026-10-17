"use client";

import dynamic from "next/dynamic";

const FlowCanvas = dynamic(() => import("@/components/FlowCanvas"), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl bg-white dark:bg-[#1e1545] p-10 text-center text-sm text-[#6d6390]">
      Loading canvas…
    </div>
  ),
});

export default function StudioPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-5">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">
            Workflow Studio
          </h1>
          <p className="text-sm text-[#6d6390] dark:text-[#b3a8dd]">
            Drag blocks onto the canvas, connect them, press{" "}
            <span className="font-bold text-[#5B3CC4]">▶ Run</span>. Try “go
            forward slowly” — then “hit that person fast” to see the safety
            gate block it.
          </p>
        </div>
      </div>
      <FlowCanvas />
    </main>
  );
}
