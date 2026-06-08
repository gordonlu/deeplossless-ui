// ── API client for deeplossless proxy ────────────────────────────────────

export const API_BASE = process.env.NEXT_PUBLIC_DEEPLOSSLESS_URL || "http://localhost:8081/v1/lcm";

let lastError: string | null = null;
export function getLastError(): string | null { return lastError; }
export function clearError(): void { lastError = null; }

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      lastError = `HTTP ${res.status}: ${res.statusText}`;
      return null;
    }
    const data = await res.json();
    return data;
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
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

// ── Event Search ──────────────────────────────────────────────────────

export interface SearchEvent {
  id: number;
  event_type: string;
  session_id: string;
  timestamp: string;
  tool_name: string | null;
  path: string | null;
  status: string | null;
  content: string;
  metadata: Record<string, unknown>;
}

export interface SearchFilter {
  event_type?: string;
  tool?: string;
  session?: string;
  status?: string;
  path?: string;
  content?: string;
  limit?: number;
}

export async function fetchSearchEvents(filter: SearchFilter): Promise<SearchEvent[] | null> {
  const params = new URLSearchParams();
  if (filter.event_type) params.set("event_type", filter.event_type);
  if (filter.tool) params.set("tool", filter.tool);
  if (filter.session) params.set("session", filter.session);
  if (filter.status) params.set("status", filter.status);
  if (filter.path) params.set("path", filter.path);
  if (filter.content) params.set("content", filter.content);
  if (filter.limit) params.set("limit", String(filter.limit));
  const qs = params.toString();
  const data = await get<{ events: SearchEvent[] }>(`/search${qs ? "?" + qs : ""}`);
  return data?.events ?? null;
}

// ── File Diffs ──────────────────────────────────────────────────────

export interface DiffEvent {
  id: number;
  session_id: string;
  tool_call_id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  change_type: "Insert" | "Delete" | "Replace";
  before_snippet: string | null;
  after_snippet: string | null;
  timestamp: number;
}

export interface DiffOverlap {
  first: { tool_call_id: string; file_path: string; lines: string };
  second: { tool_call_id: string; file_path: string; lines: string };
}

export async function fetchDiffs(session: string, filePath?: string, limit = 100): Promise<DiffEvent[] | null> {
  const params = new URLSearchParams({ session, limit: String(limit) });
  if (filePath) params.set("file_path", filePath);
  const data = await get<{ diffs: DiffEvent[] }>(`/diffs?${params}`);
  return data?.diffs ?? null;
}

export async function fetchReconstruct(session: string, filePath: string, initial?: string): Promise<string | null> {
  const params = new URLSearchParams({ session, file_path: filePath });
  if (initial) params.set("initial", initial);
  const data = await get<{ content: string }>(`/diffs/reconstruct?${params}`);
  return data?.content ?? null;
}

export async function fetchDiffOverlaps(session: string): Promise<DiffOverlap[] | null> {
  const data = await get<{ overlaps: DiffOverlap[] }>(`/diffs/overlaps?session=${session}`);
  return data?.overlaps ?? null;
}
