"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FlowNodeData, NodeStatus } from "@/lib/types";

const ACCENT: Record<string, { bar: string; chip: string; ring: string }> = {
  textInput: { bar: "#00A38F", chip: "bg-[#00A38F]", ring: "ring-[#00A38F]" },
  askAI: { bar: "#FF6B57", chip: "bg-[#FF6B57]", ring: "ring-[#FF6B57]" },
  condition: { bar: "#FFC83D", chip: "bg-[#FFC83D]", ring: "ring-[#FFC83D]" },
  driveCar: { bar: "#5B3CC4", chip: "bg-[#5B3CC4]", ring: "ring-[#5B3CC4]" },
};

const STATUS_DOT: Record<NodeStatus, string> = {
  idle: "bg-zinc-300",
  running: "bg-[#5B3CC4] animate-ping",
  success: "bg-green-500",
  blocked: "bg-amber-500",
  error: "bg-red-500",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: "idle",
  running: "running…",
  success: "done",
  blocked: "blocked",
  error: "error",
};

function Base({
  data,
  kind,
  title,
  subtitle,
  children,
}: {
  data: FlowNodeData & { status?: NodeStatus };
  kind: keyof typeof ACCENT;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const a = ACCENT[kind];
  const status = (data.status ?? "idle") as NodeStatus;
  return (
    <div
      className={`w-60 rounded-3xl bg-white dark:bg-[#1e1545] shadow-[0_8px_30px_rgba(42,22,112,0.15)] border-2 border-transparent overflow-hidden fp-pop ${
        status === "running"
          ? `fp-running ring-4 ${a.ring}`
          : status === "success"
            ? "ring-4 ring-green-400"
            : status === "blocked" || status === "error"
              ? "ring-4 ring-amber-400"
              : ""
      }`}
    >
      <div className="h-2 w-full" style={{ background: a.bar }} />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[10px] font-extrabold uppercase tracking-widest text-white px-2 py-0.5 rounded-full ${a.chip}`}
          >
            {subtitle}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 dark:text-[#b3a8dd]">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="mt-1.5 font-display text-[15px] font-extrabold leading-tight">
          {title}
        </div>
        <div className="mt-2 text-xs text-zinc-600 dark:text-[#b3a8dd] leading-relaxed">
          {children}
        </div>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const TextInputNode = memo((p: NodeProps) => {
  const d = p.data as FlowNodeData;
  return (
    <Base data={d} kind="textInput" title="Text Input" subtitle="input">
      <span className="line-clamp-3 italic">
        “{(d.prompt as string) || "Type a command…"}”
      </span>
    </Base>
  );
});
TextInputNode.displayName = "TextInputNode";

export const AskAINode = memo((p: NodeProps) => {
  const d = p.data as FlowNodeData;
  return (
    <Base data={d} kind="askAI" title="Ask AI" subtitle="think · gemini">
      Interprets the command →{" "}
      <code className="font-mono text-[11px]">{"{action, speed}"}</code>
      {(d.model as string) ? <div className="mt-1 opacity-70">{d.model}</div> : null}
    </Base>
  );
});
AskAINode.displayName = "AskAINode";

export const ConditionNode = memo((p: NodeProps) => {
  const d = p.data as FlowNodeData;
  return (
    <Base data={d} kind="condition" title="Safe?" subtitle="logic">
      Pass if safe ≤ speed {(d.maxSpeed as number) ?? 180}
      {(d.requireSafe as boolean) ?? true ? " · must be safe" : ""}
    </Base>
  );
});
ConditionNode.displayName = "ConditionNode";

export const DriveCarNode = memo((p: NodeProps) => {
  const d = p.data as FlowNodeData;
  return (
    <Base data={d} kind="driveCar" title="Drive Car" subtitle="action · sim">
      Sim car + queue · {(d.durationSec as number) ?? 2}s · auto-stop 1.5s
    </Base>
  );
});
DriveCarNode.displayName = "DriveCarNode";

export const nodeTypes = {
  textInput: TextInputNode,
  askAI: AskAINode,
  condition: ConditionNode,
  driveCar: DriveCarNode,
};
