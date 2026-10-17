export type CarAction = "F" | "B" | "L" | "R" | "S";

export interface AIDecision {
  action: CarAction;
  speed: number; // 0–255
  reply: string;
  safe: boolean;
  reason?: string;
  source: "gemini" | "openrouter" | "rules";
}

export type NodeKind = "textInput" | "askAI" | "condition" | "driveCar";

export interface FlowNodeData {
  kind: NodeKind;
  label: string;
  // textInput
  prompt?: string;
  // askAI
  model?: string;
  // condition
  maxSpeed?: number;
  requireSafe?: boolean;
  // driveCar
  durationSec?: number;
  [key: string]: unknown;
}

export type NodeStatus = "idle" | "running" | "success" | "blocked" | "error";

export interface RunLogEntry {
  t: string;
  node: string;
  message: string;
  tone: "info" | "ok" | "warn" | "err" | "ai";
}

export interface RunResult {
  decision: AIDecision;
  allowed: boolean;
  blockReason?: string;
  command: CarAction;
  speed: number;
}

export const CAR_ACTIONS: Record<CarAction, string> = {
  F: "Forward",
  B: "Reverse",
  L: "Turn left",
  R: "Turn right",
  S: "Stop",
};

export function clampSpeed(n: unknown): number {
  const v = typeof n === "number" ? n : parseInt(String(n ?? "120"), 10);
  if (!Number.isFinite(v)) return 120;
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function validateDecision(raw: unknown): AIDecision | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const action = String(r.action ?? "S").toUpperCase() as CarAction;
  if (!["F", "B", "L", "R", "S"].includes(action)) return null;
  if (typeof r.reply !== "string" || r.reply.length === 0) return null;
  return {
    action,
    speed: action === "S" ? 0 : clampSpeed(r.speed),
    reply: r.reply.slice(0, 280),
    safe: r.safe !== false,
    reason: typeof r.reason === "string" ? r.reason.slice(0, 200) : undefined,
    source: "gemini",
  };
}

/** Deterministic keyword fallback — guarantees the demo works with no API key. */
export function ruleBasedDecision(prompt: string): AIDecision {
  const p = prompt.toLowerCase();
  let action: CarAction = "S";
  if (/\b(back|reverse|reverse\b)/.test(p)) action = "B";
  else if (/\bleft\b/.test(p)) action = "L";
  else if (/\bright\b/.test(p)) action = "R";
  else if (/\b(stop|halt|freeze|wait)\b/.test(p)) action = "S";
  else if (
    /\b(go|forward|ahead|move|drive|straight|start|come|fetch|forward\b)/.test(p)
  )
    action = "F";

  let speed = 140;
  const num = p.match(/(\d{2,3})/);
  if (num) speed = clampSpeed(parseInt(num[1], 10));
  else if (/\b(slow|gently|careful)\b/.test(p)) speed = 90;
  else if (/\b(fast|quick|zoom|hurry)\b/.test(p)) speed = 220;

  const unsafe =
    /\b(explode|hit|crash|ram|hurt|attack|dangerous)\b/.test(p) || speed > 230;
  return {
    action: unsafe ? "S" : action,
    speed: unsafe || action === "S" ? 0 : speed,
    reply: unsafe
      ? "That looks unsafe, so I'll stay stopped."
      : action === "S"
        ? "Stopping the car."
        : `Driving ${CAR_ACTIONS[action].toLowerCase()} at speed ${speed}.`,
    safe: !unsafe,
    reason: "rule-based fallback (no AI key / offline)",
    source: "rules",
  };
}
