// ── Integrity Detection Rule Engine v2 ─────────────────────────────────────
// Architecture: raw events → semantic normalization → integrity rules
// Each finding carries confidence and evidence source type.
// Observability principle: absence of evidence ≠ evidence of absence.
// False positives hurt more than false negatives.

import type { SessionEvent, Evidence } from "./types";

// ── Evidence quality ──────────────────────────────────────────────────

export type Confidence = "low" | "medium" | "high";
export type EvidenceSource = "observed" | "inferred" | "speculative";

interface Finding {
  id: string;
  severity: "info" | "warning" | "critical";
  category: string;
  assertion: string;
  observation: string;
  evidence_chain: string[];
  confidence: Confidence;
  source: EvidenceSource;
}

// ── Semantic normalization ─────────────────────────────────────────────
// raw classified events → higher-level semantic events for rules

interface SemanticEvent {
  type: "mutation" | "verification" | "build" | "inspection" | "tool_call" | "retry_burst" | "tool_failure";
  count: number;
  tools: string[];
}

function normalize(events: SessionEvent[]): SemanticEvent[] {
  const result: SemanticEvent[] = [];

  // Mutation: file write/edit events
  const mutations = events.filter(e => e.type === "mutation");
  if (mutations.length > 0) {
    result.push({ type: "mutation", count: mutations.length, tools: [...new Set(mutations.map(e => {
      try { return JSON.parse(e.detail || "{}").tool_name || "unknown"; } catch { return "unknown"; }
    }))] });
  }

  // Verification: test commands
  const verifications = events.filter(e => e.type === "verification");
  if (verifications.length > 0) {
    result.push({ type: "verification", count: verifications.length, tools: [...new Set(verifications.map(e => {
      try { return JSON.parse(e.detail || "{}").tool_name || "unknown"; } catch { return "unknown"; }
    }))] });
  }

  // Build: compile commands
  const builds = events.filter(e => e.type === "build");
  if (builds.length > 0) {
    result.push({ type: "build", count: builds.length, tools: [...new Set(builds.map(e => {
      try { return JSON.parse(e.detail || "{}").tool_name || "unknown"; } catch { return "unknown"; }
    }))] });
  }

  // Tool failures: exec events with non-success outcome
  const failures = events.filter(e => {
    try {
      const v = JSON.parse(e.detail || "{}");
      return v.outcome && v.outcome !== "success";
    } catch { return false; }
  });
  if (failures.length > 0) {
    result.push({ type: "tool_failure", count: failures.length, tools: [...new Set(failures.map(e => {
      try { return JSON.parse(e.detail || "{}").tool_name || "unknown"; } catch { return "unknown"; }
    }))] });
  }

  // Retry burst: 4+ consecutive same-tool calls
  const retryBursts: string[] = [];
  let currentTool = "", currentCount = 0;
  for (const e of events) {
    let tool = "unknown";
    try { tool = JSON.parse(e.detail || "{}").tool_name || "unknown"; } catch {}
    if (tool === currentTool) {
      currentCount++;
    } else {
      if (currentCount >= 4) retryBursts.push(`${currentTool} ×${currentCount}`);
      currentTool = tool;
      currentCount = 1;
    }
  }
  if (currentCount >= 4) retryBursts.push(`${currentTool} ×${currentCount}`);
  if (retryBursts.length > 0) {
    result.push({ type: "retry_burst", count: retryBursts.length, tools: retryBursts });
  }

  return result;
}

// ── Rules (only high-confidence findings) ─────────────────────────────

export interface Rule {
  id: string;
  severity: "info" | "warning" | "critical";
  description: string;
  match: (semantic: SemanticEvent[]) => Finding | null;
}

export const rules: Rule[] = [
  // 1. Mutations without observed verification — high confidence, observed
  {
    id: "unverified_mutations",
    severity: "warning",
    description: "Code modified but no verification observed in event stream.",
    match(semantic: SemanticEvent[]) {
      const mutations = semantic.find(s => s.type === "mutation");
      if (!mutations) return null;
      const hasVerified = semantic.some(s => s.type === "verification") || semantic.some(s => s.type === "build");
      if (hasVerified) return null;
      return {
        id: "ev_unverified",
        severity: "warning",
        category: "unverified_mutations",
        assertion: `${mutations.count} file modifications observed`,
        observation: `No verification or build command was observed in the event stream. This does not mean testing did not occur — only that it was not captured.`,
        evidence_chain: [
          `${mutations.count} mutation events (${mutations.tools.slice(0, 5).join(", ")})`,
          "0 verification events observed",
          "0 build events observed",
        ],
        confidence: "high",
        source: "observed",
      };
    },
  },

  // 2. Execution lineage gap — detect unmatched tool calls
  {
    id: "lineage_gap",
    severity: "warning",
    description: "Tool calls without matching results detected — incomplete execution chain.",
    match(_semantic: SemanticEvent[]) {
      // Evaluated in detectIntegrity using raw events directly
      return null;
    },
  },

  // 3. Tool failure rate — high confidence, observed
  {
    id: "tool_failure_rate",
    severity: "warning",
    description: "Elevated tool failure rate detected.",
    match(semantic: SemanticEvent[]) {
      const failures = semantic.find(s => s.type === "tool_failure");
      if (!failures || failures.count < 3) return null;
      return {
        id: "ev_failures",
        severity: "warning",
        category: "tool_failure_rate",
        assertion: `${failures.count} tool failures observed`,
        observation: `${failures.count} tool calls returned non-success outcomes. Affected tools: ${failures.tools.slice(0, 5).join(", ")}.`,
        evidence_chain: [
          `${failures.count} failure outcomes detected`,
          `Tools: ${failures.tools.join(", ")}`,
        ],
        confidence: "high",
        source: "observed",
      };
    },
  },

  // 4. Retry burst — medium confidence, inferred pattern
  {
    id: "retry_burst",
    severity: "warning",
    description: "Consecutive identical tool calls detected — possible retry loop.",
    match(semantic: SemanticEvent[]) {
      const burst = semantic.find(s => s.type === "retry_burst");
      if (!burst) return null;
      return {
        id: "ev_retry_burst",
        severity: "warning",
        category: "retry_burst",
        assertion: `${burst.count} retry burst(s) observed`,
        observation: `Consecutive identical tool calls suggest repeated attempts: ${burst.tools.slice(0, 3).join(", ")}. This may be normal agent workflow or a retry loop.`,
        evidence_chain: burst.tools.slice(0, 5).map(t => `Burst: ${t} consecutive calls`),
        confidence: "medium",
        source: "inferred",
      };
    },
  },
];

// ── Detection pipeline ─────────────────────────────────────────────────

export function detectIntegrity(events: SessionEvent[]): {
  evidence: Evidence[];
  status: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "CONFLICTED";
  warningCount: number;
  criticalCount: number;
} {
  const semantic = normalize(events);
  const findings: Finding[] = [];
  for (const rule of rules) {
    const result = rule.match(semantic);
    if (result) findings.push(result);
  }

  // Lineage gap: check raw event stream for unmatched tool calls.
  const tcCount = events.filter(e => e.type === "tool_call").length;
  const trCount = events.filter(e => e.type === "tool_result").length;
  if (tcCount > 0 && tcCount > trCount + 3) {
    findings.push({
      id: "ev_lineage_gap",
      severity: "warning",
      category: "lineage_gap",
      assertion: `${tcCount - trCount} unmatched tool calls`,
      observation: `${tcCount} tool call events, ${trCount} tool result events. ${tcCount - trCount} tool call(s) may not have completed.`,
      evidence_chain: [`${tcCount} tool_call events`, `${trCount} tool_result events`, `${tcCount - trCount} unmatched`],
      confidence: "medium",
      source: "inferred",
    });
  }

  const criticals = findings.filter(f => f.severity === "critical").length;
  const warnings = findings.filter(f => f.severity === "warning").length;

  let status: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "CONFLICTED";
  if (criticals > 0) status = "CONFLICTED";
  else if (warnings > 1) status = "PARTIAL";
  else if (warnings === 1) status = "UNVERIFIED";
  else status = "VERIFIED";

  const evidence: Evidence[] = findings.map(f => ({
    id: f.id,
    severity: f.severity,
    category: f.category,
    assertion: f.assertion,
    observation: f.observation,
    evidence_chain: f.evidence_chain,
  }));

  return { evidence, status, warningCount: warnings, criticalCount: criticals };
}
