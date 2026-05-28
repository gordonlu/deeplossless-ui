// ── API client for deeplossless proxy ────────────────────────────────────

export const API_BASE = process.env.NEXT_PUBLIC_DEEPLOSSLESS_URL || "http://localhost:8081/v1/lcm";

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface SessionSummary {
  id: number;
  fingerprint: string;
  model: string;
  event_count: number;
  total_tokens: number;
}

export interface SessionEventRaw {
  id: number;
  type: string;
  payload: string;
  seq_no: number;
  timestamp: string;
}

export interface SessionEventsResponse {
  session_id: number;
  events: SessionEventRaw[];
  total: number;
  tool_counts: { tool: string; count: number }[];
}

export interface StabilityInfo {
  conversation_id: number;
  samples: number;
  unique_hashes: number;
  stability_pct: number;
  recent: string[];
}

export async function fetchSessions(): Promise<SessionSummary[] | null> {
  const data = await get<{ sessions: SessionSummary[] }>("/sessions?limit=20");
  return data?.sessions ?? null;
}

export async function fetchSessionEvents(id: number, limit = 1000): Promise<SessionEventsResponse | null> {
  return await get<SessionEventsResponse>(`/sessions/${id}/events?limit=${limit}`);
}

export interface PatchItem {
  role: string;
  content: string;
}

export async function fetchSessionPatches(id: number): Promise<PatchItem[] | null> {
  const data = await get<{ patches: PatchItem[] }>(`/sessions/${id}/patches?limit=20`);
  return data?.patches ?? null;
}

export async function fetchCacheStability(): Promise<StabilityInfo[] | null> {
  const data = await get<{ conversations: StabilityInfo[] }>("/cache/stability");
  return data?.conversations ?? null;
}

// ── Latency ─────────────────────────────────────────────────────────────

export interface LatencyRecord {
  timestamp: string;
  endpoint: string;
  status_code: number;
  upstream_status: number | null;
  latency_ms: number;
  error: string | null;
}

export interface LatencySummary {
  total: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
  upstream_errors: number;
  timeouts_30s_plus: number;
}

export async function fetchLatencyRecords(limit = 50): Promise<LatencyRecord[] | null> {
  const data = await get<{ records: LatencyRecord[] }>(`/latency?limit=${limit}`);
  return data?.records ?? null;
}

export async function fetchLatencySummary(): Promise<LatencySummary | null> {
  return await get<LatencySummary>("/latency/summary");
}

// ── System Prompt ────────────────────────────────────────────────────────

export interface SystemPromptEntry {
  id: number;
  content: string;
  token_count: number;
  stored_at: string;
}

export async function fetchSystemPrompts(id: number): Promise<SystemPromptEntry[] | null> {
  const data = await get<{ prompts: SystemPromptEntry[] }>(`/sessions/${id}/system-prompt`);
  return data?.prompts ?? null;
}
