"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { nodeTypes } from "./FlowNodes";
import SimCar, { type SimCarHandle } from "./SimCar";
import RunLog from "./RunLog";
import {
  CAR_ACTIONS,
  type AIDecision,
  type FlowNodeData,
  type NodeStatus,
  type RunLogEntry,
} from "@/lib/types";
import {
  persistRun,
  persistWorkflow,
  queueCarCommand,
  supabaseConfigured,
} from "@/lib/supabase";

type FNode = Node<FlowNodeData & { status?: NodeStatus }>;

const WORKFLOW_ID = "demo-workflow";
let idc = 100;
const nid = () => `n${idc++}`;

const PALETTE: {
  kind: FNode["type"];
  title: string;
  desc: string;
  dot: string;
}[] = [
  { kind: "textInput", title: "Text Input", desc: "Typed command", dot: "bg-[#00A38F]" },
  { kind: "askAI", title: "Ask AI", desc: "Gemini → JSON", dot: "bg-[#FF6B57]" },
  { kind: "condition", title: "Condition", desc: "Safety gate", dot: "bg-[#FFC83D]" },
  { kind: "driveCar", title: "Drive Car", desc: "Sim + queue", dot: "bg-[#5B3CC4]" },
];

const DEFAULTS: Record<string, FlowNodeData> = {
  textInput: { kind: "textInput", label: "Text Input", prompt: "Go forward slowly" },
  askAI: { kind: "askAI", label: "Ask AI", model: "gemini-2.0-flash" },
  condition: { kind: "condition", label: "Safe?", maxSpeed: 180, requireSafe: true },
  driveCar: { kind: "driveCar", label: "Drive Car", durationSec: 2 },
};

const now = () =>
  new Date().toLocaleTimeString("en-GB", { hour12: false });

function speak(text: string) {
  // Prefer ElevenLabs (server) → fall back to browser speech.
  fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
    .then(async (r) => {
      if (r.ok && r.headers.get("Content-Type")?.includes("audio")) {
        const url = URL.createObjectURL(await r.blob());
        new Audio(url).play();
      } else if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
        speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      }
    })
    .catch(() => {
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
        speechSynthesis.speak(new SpeechSynthesisUtterance(text));
      }
    });
}

export default function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<
    FlowNodeData & { status?: NodeStatus }
  >([
    {
      id: "n1",
      type: "textInput",
      position: { x: 20, y: 120 },
      data: { ...DEFAULTS.textInput },
    },
    {
      id: "n2",
      type: "askAI",
      position: { x: 300, y: 120 },
      data: { ...DEFAULTS.askAI },
    },
    {
      id: "n3",
      type: "condition",
      position: { x: 580, y: 120 },
      data: { ...DEFAULTS.condition },
    },
    {
      id: "n4",
      type: "driveCar",
      position: { x: 860, y: 120 },
      data: { ...DEFAULTS.driveCar },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([
    { id: "e1", source: "n1", target: "n2", animated: true },
    { id: "e2", source: "n2", target: "n3", animated: true },
    { id: "e3", source: "n3", target: "n4", animated: true },
  ]);
  const [log, setLog] = useState<RunLogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<FNode | null>(null);
  const [store, setStore] = useState<"supabase" | "local">(
    supabaseConfigured() ? "supabase" : "local",
  );
  const [voiceOn, setVoiceOn] = useState(true);
  const carRef = useRef<SimCarHandle>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const push = useCallback(
    (node: string, message: string, tone: RunLogEntry["tone"] = "info") =>
      setLog((l) => [{ t: now(), node, message, tone }, ...l].slice(0, 60)),
    [],
  );

  const setStatus = useCallback(
    (id: string, status: NodeStatus) =>
      setNodes((ns) =>
        ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status } } : n)),
      ),
    [setNodes],
  );

  const onConnect = useCallback(
    (c: Connection) => setEdges((e) => addEdge({ ...c, animated: true }, e)),
    [setEdges],
  );

  const onDrop = useCallback(
    (ev: React.DragEvent) => {
      ev.preventDefault();
      const kind = ev.dataTransfer.getData("application/flowpilot");
      if (!kind || !DEFAULTS[kind]) return;
      const bounds = wrapRef.current?.getBoundingClientRect();
      const position = {
        x: (ev.clientX - (bounds?.left ?? 0) - 120) || Math.random() * 400,
        y: (ev.clientY - (bounds?.top ?? 0) - 60) || Math.random() * 300,
      };
      setNodes((ns) => [
        ...ns,
        { id: nid(), type: kind, position, data: { ...DEFAULTS[kind] } },
      ]);
    },
    [setNodes],
  );

  const sortedChain = useMemo(() => {
    // Walk from node(s) with no incoming edge, following first edge each hop.
    const targets = new Set(edges.map((e) => e.target));
    const start = nodes.find((n) => !targets.has(n.id)) ?? nodes[0];
    if (!start) return [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const chain: FNode[] = [];
    const seen = new Set<string>();
    let cur: FNode | undefined = start as FNode;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.push(cur);
      const next = edges.find((e) => e.source === cur!.id);
      cur = next ? (byId.get(next.target) as FNode) : undefined;
    }
    return chain;
  }, [nodes, edges]);

  const updateData = (id: string, patch: Partial<FlowNodeData>) => {
    setNodes((ns) =>
      ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
    setSelected((s) => (s && s.id === id ? { ...s, data: { ...s.data, ...patch } } : s));
  };

  async function handleRun() {
    if (running) return;
    const input = nodes.find((n) => n.type === "textInput");
    const ai = nodes.find((n) => n.type === "askAI");
    const cond = nodes.find((n) => n.type === "condition");
    const car = nodes.find((n) => n.type === "driveCar");
    if (!input || !ai || !cond || !car) {
      push("run", "Need all 4 blocks on the canvas: Text Input → Ask AI → Condition → Drive Car.", "err");
      return;
    }
    setRunning(true);
    setNodes((ns) =>
      ns.map((n) => ({ ...n, data: { ...n.data, status: "idle" as NodeStatus } })),
    );
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

    try {
      // 1 · Text Input
      setStatus(input.id, "running");
      const prompt = String(input.data.prompt ?? "").trim() || "Go forward slowly";
      push("input", `Command: “${prompt}”`);
      await pause(450);
      setStatus(input.id, "success");

      // 2 · Ask AI
      setStatus(ai.id, "running");
      push("ask ai", "Asking Gemini for structured JSON…", "ai");
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("ai-error");
      const d = (await res.json()) as AIDecision;
      push(
        "ask ai",
        `→ action=${d.action} (${CAR_ACTIONS[d.action]}) speed=${d.speed} safe=${d.safe} [${d.source}] — “${d.reply}”`,
        "ai",
      );
      await pause(350);
      setStatus(ai.id, "success");

      // 3 · Condition (safety gate)
      setStatus(cond.id, "running");
      const maxSpeed = Number(cond.data.maxSpeed ?? 180);
      const requireSafe = cond.data.requireSafe !== false;
      const blocked =
        (requireSafe && !d.safe) || d.speed > maxSpeed;
      await pause(350);
      let command = d.action;
      let speed = d.speed;
      if (blocked) {
        const why = !d.safe
          ? "AI flagged unsafe"
          : `speed ${d.speed} > limit ${maxSpeed}`;
        push("safe?", `BLOCKED — ${why}. Forcing STOP.`, "warn");
        setStatus(cond.id, "blocked");
        command = "S";
        speed = 0;
      } else {
        push("safe?", `PASS — safe=${d.safe}, speed ${d.speed} ≤ ${maxSpeed}.`, "ok");
        setStatus(cond.id, "success");
      }

      // 4 · Drive Car
      setStatus(car.id, "running");
      const durationSec = Number(car.data.durationSec ?? 2);
      const queued = await queueCarCommand(command, speed);
      push(
        "drive",
        `${CAR_ACTIONS[command]}${command === "S" ? "" : ` @ ${speed}`} for ${durationSec}s (queue: ${queued}).`,
        command === "S" && blocked ? "warn" : "ok",
      );
      await carRef.current?.drive(command, speed, durationSec);
      setStatus(car.id, blocked ? "blocked" : "success");

      // output
      if (voiceOn) speak(blocked ? "That looks unsafe, so I stopped." : d.reply);
      push("run", blocked ? "Finished with safety stop." : "Workflow complete.", blocked ? "warn" : "ok");
      persistRun({
        workflow_id: WORKFLOW_ID,
        status: blocked ? "blocked" : "success",
        log: [{ prompt, decision: d, blocked }],
      }).catch(() => {});
    } catch (err) {
      push("run", `Failed: ${err instanceof Error ? err.message : "unknown"}. Showing sim stop.`, "err");
      carRef.current?.estop();
    } finally {
      setRunning(false);
    }
  }

  // autosave (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      persistWorkflow(WORKFLOW_ID, "Demo workflow", { nodes, edges })
        .then(setStore)
        .catch(() => setStore("local"));
    }, 1200);
    return () => clearTimeout(t);
  }, [nodes, edges]);

  function resetDemo() {
    carRef.current?.estop();
    setNodes((ns) =>
      ns.map((n) => ({ ...n, data: { ...n.data, status: "idle" as NodeStatus } })),
    );
    setLog([]);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_340px]">
      {/* Palette */}
      <aside className="rounded-3xl bg-white dark:bg-[#1e1545] p-4 shadow-[0_8px_30px_rgba(42,22,112,0.12)] h-fit">
        <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-[#6d6390] dark:text-[#b3a8dd]">
          Blocks
        </h2>
        <p className="text-xs mt-1 text-[#6d6390] dark:text-[#b3a8dd]">
          Drag onto the canvas
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {PALETTE.map((b) => (
            <div
              key={b.kind}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("application/flowpilot", b.kind!)
              }
              className="cursor-grab active:cursor-grabbing rounded-2xl border-2 border-[#E9E1FF] dark:border-[#2b2160] p-3 hover:border-[#5B3CC4] hover:shadow-lg transition fp-pop"
            >
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${b.dot}`} />
                <span className="font-bold text-sm">{b.title}</span>
              </div>
              <div className="text-xs text-[#6d6390] dark:text-[#b3a8dd]">{b.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-[#E9E1FF] dark:bg-[#2b2160] p-3 text-xs leading-relaxed">
          <span className="font-bold">Chain:</span> Text → AI → Safe? → Car.
          Select a block to edit its settings.
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex flex-col gap-3 min-w-0">
        <div
          ref={wrapRef}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="h-[440px] rounded-3xl overflow-hidden bg-white dark:bg-[#1e1545] shadow-[0_8px_30px_rgba(42,22,112,0.12)] relative"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges as Edge[]}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n as FNode)}
            onPaneClick={() => setSelected(null)}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
          >
            <Background gap={24} color="#5B3CC422" />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
          {/* Floating Run */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="rounded-full bg-[#5B3CC4] hover:bg-[#2A1670] disabled:opacity-60 text-white font-display font-extrabold px-8 py-3.5 shadow-[0_12px_40px_rgba(91,60,196,0.5)] transition active:scale-95 text-lg"
            >
              {running ? "● Running…" : "▶ Run workflow"}
            </button>
            <button
              onClick={() => carRef.current?.estop()}
              title="Emergency stop"
              className="rounded-full bg-[#FF6B57] hover:bg-red-600 text-white font-extrabold px-5 py-3.5 shadow-lg transition active:scale-95"
            >
              ■
            </button>
          </div>
        </div>

        {/* Inspector */}
        <div className="rounded-3xl bg-white dark:bg-[#1e1545] p-4 shadow-[0_8px_30px_rgba(42,22,112,0.12)]">
          {!selected ? (
            <p className="text-sm text-[#6d6390] dark:text-[#b3a8dd]">
              Click any block to edit it. Execution order:{" "}
              <span className="font-mono">
                {sortedChain.map((n) => n.data.label).join(" → ") || "—"}
              </span>
            </p>
          ) : selected.type === "textInput" ? (
            <label className="block">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#00A38F]">
                Text Input · command
              </span>
              <input
                value={String(selected.data.prompt ?? "")}
                onChange={(e) => updateData(selected.id, { prompt: e.target.value })}
                placeholder="e.g. Go forward slowly"
                className="mt-1 w-full rounded-2xl border-2 border-[#E9E1FF] dark:border-[#2b2160] bg-transparent px-4 py-2.5 text-sm outline-none focus:border-[#00A38F]"
              />
              <span className="text-xs text-[#6d6390]">Try: “go forward”, “turn left”, “stop”.</span>
            </label>
          ) : selected.type === "askAI" ? (
            <div className="text-sm">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF6B57]">
                Ask AI · Gemini
              </span>
              <p className="mt-1 text-[#6d6390] dark:text-[#b3a8dd]">
                Server-side only — no key ever reaches the browser. Without a{" "}
                <code className="font-mono">GEMINI_API_KEY</code> it uses a
                deterministic keyword parser so the demo always works.
              </p>
            </div>
          ) : selected.type === "condition" ? (
            <div className="flex flex-wrap items-end gap-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#b98a00] w-full">
                Condition · safety gate
              </span>
              <label className="text-sm">
                Max speed
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={Number(selected.data.maxSpeed ?? 180)}
                  onChange={(e) =>
                    updateData(selected.id, { maxSpeed: Number(e.target.value) })
                  }
                  className="ml-2 w-24 rounded-2xl border-2 border-[#E9E1FF] dark:border-[#2b2160] bg-transparent px-3 py-1.5 outline-none focus:border-[#FFC83D]"
                />
              </label>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.data.requireSafe !== false}
                  onChange={(e) =>
                    updateData(selected.id, { requireSafe: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#FFC83D]"
                />
                Require safe=true
              </label>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#5B3CC4] w-full">
                Drive Car · simulated + queue
              </span>
              <label className="text-sm">
                Duration (s)
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={Number(selected.data.durationSec ?? 2)}
                  onChange={(e) =>
                    updateData(selected.id, { durationSec: Number(e.target.value) })
                  }
                  className="ml-2 w-24 rounded-2xl border-2 border-[#E9E1FF] dark:border-[#2b2160] bg-transparent px-3 py-1.5 outline-none focus:border-[#5B3CC4]"
                />
              </label>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={voiceOn}
                  onChange={(e) => setVoiceOn(e.target.checked)}
                  className="h-4 w-4 accent-[#5B3CC4]"
                />
                Speak reply aloud
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4 min-w-0">
        <SimCar ref={carRef} />
        <div className="rounded-3xl bg-white dark:bg-[#1e1545] p-4 shadow-[0_8px_30px_rgba(42,22,112,0.12)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-[#6d6390] dark:text-[#b3a8dd]">
              Run log
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  store === "supabase"
                    ? "bg-green-100 text-green-800"
                    : "bg-[#FFC83D]/30 text-[#7a5b00]"
                }`}
                title={store === "supabase" ? "Saving to Supabase" : "Supabase not configured — saving locally"}
              >
                {store === "supabase" ? "● supabase" : "● local save"}
              </span>
              <button
                onClick={resetDemo}
                className="text-[11px] font-bold text-[#5B3CC4] hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
          <RunLog log={log} />
        </div>
      </div>
    </div>
  );
}
