// ── Shared types — single source of truth ───────────────────────────────

export interface SessionEvent {
  id: number;
  timestamp: Date;
  type: "user_prompt" | "assistant_message" | "tool_call" | "tool_result" | "patch_applied" | "retry" | "stream_interrupt" | "warning" | "evidence_gap" | "claim_detected" | "exec_result" | "exec_start" | "exec_failed" | "inspection" | "read" | "verification" | "build" | "validation" | "mutation" | "network" | "exec";
  summary: string;
  detail?: string;
  severity?: "info" | "warning" | "critical";
}

export interface Evidence {
  id: string;
  severity: "info" | "warning" | "critical";
  category: string;
  assertion: string;
  observation: string;
  evidence_chain: string[];
  diff_line?: number;
  confidence?: "low" | "medium" | "high";
  source?: "observed" | "inferred" | "speculative";
}

export interface Session {
  id: string;
  label: string;
  model: string;
  started_at: Date;
  tokens: number;
  event_count: number;
  warning_count: number;
  critical_count: number;
  integrity_status: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "CONFLICTED";
  events: SessionEvent[];
  evidence: Evidence[];
}
