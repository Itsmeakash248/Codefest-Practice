import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!browserClient) browserClient = createClient(url, key);
  return browserClient;
}

export function supabaseServer(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service-role server-side; fall back to anon key for local dev.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/* ---------- localStorage fallback so the demo never dies ---------- */

const LS_WORKFLOWS = "flowpilot.workflows.v1";
const LS_RUNS = "flowpilot.runs.v1";

export function localSaveWorkflow(id: string, data: unknown) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_WORKFLOWS) ?? "{}");
    all[id] = { id, data, updated_at: new Date().toISOString() };
    localStorage.setItem(LS_WORKFLOWS, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function localSaveRun(entry: unknown) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_RUNS) ?? "[]");
    all.unshift({ ...(entry as object), created_at: new Date().toISOString() });
    localStorage.setItem(LS_RUNS, JSON.stringify(all.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export async function persistWorkflow(
  id: string,
  name: string,
  graph: { nodes: unknown; edges: unknown },
): Promise<"supabase" | "local"> {
  const sb = supabaseBrowser();
  if (sb) {
    const { error } = await sb
      .from("workflows")
      .upsert(
        { id, name, nodes: graph.nodes, edges: graph.edges },
        { onConflict: "id" },
      );
    if (!error) return "supabase";
  }
  localSaveWorkflow(id, { name, ...graph });
  return "local";
}

export async function persistRun(run: {
  workflow_id: string;
  status: string;
  log: unknown;
}): Promise<void> {
  const sb = supabaseBrowser();
  if (sb) {
    const { error } = await sb.from("runs").insert(run);
    if (!error) return;
  }
  localSaveRun(run);
}

/** Queue a car command (Supabase) — the ESP8266 polls this table. */
export async function queueCarCommand(
  command: string,
  speed: number,
): Promise<"supabase" | "local"> {
  try {
    const res = await fetch("/api/car-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, speed }),
    });
    if (res.ok) {
      const j = await res.json();
      return j.store === "supabase" ? "supabase" : "local";
    }
  } catch {
    /* offline */
  }
  return "local";
}
