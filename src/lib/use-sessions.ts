"use client";

import { useState, useEffect } from "react";
import { fetchSessions, fetchSessionEvents, type SessionSummary } from "./api";

export interface RealSession {
  id: number;
  fingerprint: string;
  model: string;
  event_count: number;
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
  const [sessions, setSessions] = useState<RealSession[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      const list = await fetchSessions();
      if (!list || list.length === 0) {
        if (!cancelled) setStatus("error");
        return;
      }
      // Load events for the first few sessions
      const loaded: RealSession[] = [];
      for (const s of list.slice(0, 10)) {
        const events = await fetchSessionEvents(s.id);
        loaded.push({
          id: s.id,
          fingerprint: s.fingerprint,
          model: s.model,
          event_count: s.event_count,
          events: (events || []).map(e => ({
            id: e.id,
            timestamp: e.timestamp,
            type: e.type || "tool_call",
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
        setStatus("live");
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { sessions, status, activeIdx, setActiveIdx };
}

function tryParseSummary(payload: string, kind: string): string {
  try {
    const v = JSON.parse(payload);
    if (typeof v === "string") return v.slice(0, 80);
    if (v.text) return v.text.slice(0, 80);
    if (v.summary) return v.summary.slice(0, 80);
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
