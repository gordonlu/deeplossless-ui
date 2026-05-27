// ── API client for deeplossless proxy ────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_DEEPLOSSLESS_URL || "http://localhost:8080/v1/lcm";

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // API unavailable → fall back to fake data
  }
}

export interface SessionSummary {
  id: number;
  fingerprint: string;
  model: string;
  event_count: number;
}

export interface SessionEventRaw {
  id: number;
  type: string;
  payload: string;
  seq_no: number;
  timestamp: string;
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

export async function fetchSessionEvents(id: number): Promise<SessionEventRaw[] | null> {
  const data = await get<{ events: SessionEventRaw[] }>(`/sessions/${id}/events?limit=200`);
  return data?.events ?? null;
}

export async function fetchCacheStability(): Promise<StabilityInfo[] | null> {
  const data = await get<{ conversations: StabilityInfo[] }>("/cache/stability");
  return data?.conversations ?? null;
}
