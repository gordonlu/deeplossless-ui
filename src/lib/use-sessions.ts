"use client";

import { useState, useEffect } from "react";
import { fetchSessions, fetchSessionEvents, type SessionSummary } from "./api";

export interface RealSession {
  id: number;
  fingerprint: string;
  model: string;
  event_count: number;
  total_tokens: number;
  events: Array<{
    id: number;
    timestamp: string;
    type: string;
    summary: string;
    detail?: string;
    severity?: "info" | "warning" | "critical";
  }>;
  evidence: Array<{
    id: string;
    severity: "warning" | "critical" | "info";
    category: string;
    assertion: string;
    observation: string;
    evidence_chain: string[];
  }>;
  integrity_status: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "CONFLICTED";
  warning_count: number;
  critical_count: number;
}

export type ApiStatus = "loading" | "live" | "error";

export function useSessions(): { sessions: RealSession[]; status: ApiStatus; activeIdx: number; setActiveIdx: (i: number) => void } {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [activeIdx, setActiveIdx] = useState(0);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("dl_active_session_id");
    return null;
  });
  function setAndSaveIdx(i: number) {
    const id = String(sessions[i]?.id || "");
    sessionStorage.setItem("dl_active_session_id", id);
    setSavedSessionId(id);
    setActiveIdx(i);
  }
  const [sessions, setSessions] = useState<RealSession[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(isInitial: boolean) {
      if (isInitial) setStatus("loading");
      const list = await fetchSessions();
      if (!list || list.length === 0) {
        if (!cancelled && isInitial) setStatus("error");
        return;
      }
      // Load events for the first few sessions
      const loaded: RealSession[] = [];
      for (const s of list.slice(0, 10)) {
        const resp = await fetchSessionEvents(s.id);
        const events = resp?.events || [];
        loaded.push({
          id: s.id,
          fingerprint: s.fingerprint,
          model: s.model,
          event_count: resp?.total ?? s.event_count,
          total_tokens: s.total_tokens,
          events: events.map(e => ({
            id: e.id,
            timestamp: e.timestamp,
            type: mapEventType(e.type, e.payload),
            summary: tryParseSummary(e.payload, e.type),
            detail: e.payload,
            severity: inferSeverity(e.type),
          })),
          evidence: [],
          integrity_status: "UNVERIFIED",
          warning_count: 0,
          critical_count: 0,
        });
      }
      if (!cancelled) {
        setSessions(loaded);
        // Restore previously selected session by ID
        const currentSavedId = sessionStorage.getItem("dl_active_session_id");
        if (currentSavedId) {
          const idx = loaded.findIndex(s => String(s.id) === currentSavedId);
          if (idx >= 0) setActiveIdx(idx);
        }
        if (isInitial) {
          setStatus("live");
          setInitialLoad(false);
        }
      }
    }
    load(true);
    // Auto-refresh every 5s — silent, no status change
    const interval = setInterval(() => load(false), 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { sessions, status, activeIdx, setActiveIdx: setAndSaveIdx };
}

import { mapEventType, classifyTool } from "./classify";

function estimateTokens(events: Array<{ payload?: string; detail?: string }>): number {
  let total = 0;
  for (const e of events) {
    const text = e.payload || e.detail || "";
    const cjk = (text.match(/[一-鿿]/g) || []).length;
    total += Math.round(cjk * 0.6 + (text.length - cjk) * 0.3);
  }
  return total;
}

function tryParseSummary(payload: string, kind: string): string {
  try {
    const v = JSON.parse(payload);
    if (typeof v === "string") return v.slice(0, 80);
    if (v.outcome && v.tool_name) {
      const category = classifyTool(v.tool_name).category;
      return `${category}: ${v.tool_name} → ${v.outcome}`;
    }
    if (v.tool_name) {
      const category = classifyTool(v.tool_name).category;
      return `${category}: ${v.tool_name}`;
    }
    if (v.text) return v.text.slice(0, 80);
    if (v.summary) return v.summary.slice(0, 80);
    // Object but no recognizable summary fields
    const keys = Object.keys(v).filter(k => k !== "parallel_group" && k !== "parent_span_id" && k !== "span_id" && k !== "span_mode");
    if (keys.length > 0) return `${kind}: ${keys.join(", ")}`;
    return kind;
  } catch {
    return payload.slice(0, 80) || kind;
  }
}

function inferSeverity(kind: string): "info" | "warning" | "critical" | undefined {
  if (kind.toLowerCase().includes("gap") || kind.toLowerCase().includes("claim")) return "critical";
  if (kind.toLowerCase().includes("warning") || kind === "retry") return "warning";
  return undefined;
}
