// ── Integrity Detection Rule Engine ────────────────────────────────────────
// Pure deterministic logic — no LLM calls.
// Event stream → rule matcher → evidence records.

import type { SessionEvent, Evidence } from "./fake-data";

export type Severity = "info" | "warning" | "critical";
export type EvidenceCategory =
  | "no_test_execution"
  | "fake_completion"
  | "todo_masking"
  | "silent_fallback"
  | "tool_avoidance"
  | "tiny_diff_large_task"
  | "untouched_target_file";

export interface Rule {
  id: string;
  category: EvidenceCategory;
  severity: Severity;
  description: string;
  match: (events: SessionEvent[]) => Evidence | null;
}

// ── Claim Phrases ───────────────────────────────────────────────────────
const CLAIM_PATTERNS = [
  /\b(fixed|completed|tested|verified|implemented|resolved|done|passing|works)\b/i,
  /\b(tests pass|all green|no failures)\b/i,
  /\b(should be good|should work|ready to merge)\b/i,
];

// ── Test Commands ───────────────────────────────────────────────────────
const TEST_COMMANDS = [
  "cargo test", "npm test", "npm run test", "yarn test", "pnpm test",
  "pytest", "go test", "jest", "vitest", "mocha",
  "cargo build", "cargo check", "npm run build", "make",
];

// ── TODO Patterns ──────────────────────────────────────────────────────
const TODO_PATTERNS = [
  /\bTODO\b/, /\bFIXME\b/, /\bHACK\b/,
  /\bplaceholder\b/i, /\bstub\b/i, /\bmock\b/i,
  /\btemporary\b/i, /\bworkaround\b/i,
];

// ── Silent Fallback Patterns ────────────────────────────────────────────
const RUST_FALLBACKS = [
  "unwrap_or_default()", ".ok()", "let _ =", ".unwrap_or(",
];
const JS_FALLBACKS = [
  "catch(() => {})", "catch(()=>{})", ".catch(()=>", ".catch(() =>",
];

// ── Rule Implementations ────────────────────────────────────────────────

export const rules: Rule[] = [
  // 1. Claim Without Evidence
  {
    id: "fake_completion",
    category: "fake_completion",
    severity: "critical",
    description: "Agent claimed completion or testing, but no matching test/verification commands were executed.",
    match(events: SessionEvent[]): Evidence | null {
      const claims = events.filter(e =>
        e.type === "claim_detected" || e.type === "assistant_message"
      );
      for (const claim of claims) {
        const text = (claim.summary + " " + (claim.detail || "")).toLowerCase();
        const isClaim = CLAIM_PATTERNS.some(p => p.test(text));
        if (!isClaim) continue;

        // Find test/verify commands before this claim
        const before = events.filter(e => e.id < claim.id);
        const testRan = before.some(e =>
          e.type === "tool_call" &&
          TEST_COMMANDS.some(cmd =>
            (e.summary + (e.detail || "")).toLowerCase().includes(cmd)
          )
        );

        if (!testRan) {
          // Build evidence chain
          const patches = before.filter(e => e.type === "patch_applied");
          const chain: string[] = [];
          for (const p of patches) {
            chain.push(`${p.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} — ${p.summary}`);
          }
          chain.push(`${claim.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} — CLAIM: "${claim.summary}"`);
          chain.push("No test/verification command found between patch and claim");

          return {
            id: `ev_${claim.id}`,
            severity: "critical",
            category: "fake_completion",
            assertion: claim.detail || claim.summary,
            observation: `Claim made at ${claim.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} — but no test or verification command was executed between the last patch and this claim.`,
            evidence_chain: chain,
          };
        }
      }
      return null;
    },
  },

  // 2. No Test Execution
  {
    id: "no_test_execution",
    category: "no_test_execution",
    severity: "warning",
    description: "Code patches were applied but no build or test command was ever executed.",
    match(events: SessionEvent[]): Evidence | null {
      const patches = events.filter(e => e.type === "patch_applied");
      if (patches.length === 0) return null;

      const hasBuild = events.some(e =>
        e.type === "tool_call" &&
        TEST_COMMANDS.some(cmd =>
          (e.summary + (e.detail || "")).toLowerCase().includes(cmd)
        )
      );

      if (!hasBuild && patches.length > 0) {
        const lastPatch = patches[patches.length - 1];
        return {
          id: "ev_no_test",
          severity: "warning",
          category: "no_test_execution",
          assertion: `${patches.length} patch(es) applied without verification`,
          observation: `${patches.length} code patches were applied but no build or test command was detected in the entire session.`,
          evidence_chain: patches.map((p, i) =>
            `${p.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} — Patch ${i + 1}: ${p.summary}`
          ),
        };
      }
      return null;
    },
  },

  // 3. TODO Leakage
  {
    id: "todo_masking",
    category: "todo_masking",
    severity: "warning",
    description: "TODO, stub, or placeholder patterns detected in patches — may indicate incomplete work.",
    match(events: SessionEvent[]): Evidence | null {
      const patches = events.filter(e => e.type === "patch_applied");
      for (const patch of patches) {
        const text = patch.detail || patch.summary;
        for (const pattern of TODO_PATTERNS) {
          if (pattern.test(text)) {
            return {
              id: `ev_todo_${patch.id}`,
              severity: "warning",
              category: "todo_masking",
              assertion: "Code patch appears to contain incomplete work",
              observation: `Patch "${patch.summary}" contains pattern matching: ${pattern.source}. This may indicate incomplete or placeholder implementation.`,
              evidence_chain: [
                `${patch.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} — Patch applied: ${patch.summary}`,
                `Matched pattern: ${pattern.source}`,
              ],
            };
          }
        }
      }
      return null;
    },
  },

  // 4. Silent Fallback
  {
    id: "silent_fallback",
    category: "silent_fallback",
    severity: "warning",
    description: "Error-swallowing patterns detected — unwrap_or_default, .ok(), empty catch blocks.",
    match(events: SessionEvent[]): Evidence | null {
      const patches = events.filter(e => e.type === "patch_applied");
      for (const patch of patches) {
        const text = patch.detail || patch.summary;
        for (const fb of [...RUST_FALLBACKS, ...JS_FALLBACKS]) {
          if (text.includes(fb)) {
            return {
              id: `ev_fb_${patch.id}`,
              severity: "warning",
              category: "silent_fallback",
              assertion: `"${fb}" in patch`,
              observation: `Silent fallback pattern "${fb}" masks errors instead of propagating them. On failure, the system continues with default/empty state — errors become invisible.`,
              evidence_chain: [
                `${patch.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} — Patch contains: ${fb}`,
                `Full patch: ${patch.summary}`,
                "This pattern silently swallows errors instead of propagating them",
              ],
            };
          }
        }
      }
      return null;
    },
  },

  // 5. Tool Avoidance
  {
    id: "tool_avoidance",
    category: "tool_avoidance",
    severity: "warning",
    description: "Task that typically requires compilation/testing was done without running build or test tools.",
    match(events: SessionEvent[]): Evidence | null {
      const patches = events.filter(e => e.type === "patch_applied");
      const toolCalls = events.filter(e => e.type === "tool_call");
      if (patches.length === 0) return null;

      // Check if patches modified code files (not docs/config)
      const codePatches = patches.filter(p => {
        const text = (p.summary + (p.detail || "")).toLowerCase();
        return /\.(rs|ts|js|py|go|java|c|cpp)$/.test(text) ||
          text.includes(".rs") || text.includes(".ts") || text.includes(".py");
      });

      if (codePatches.length === 0) return null;

      const hasBuildTool = toolCalls.some(t =>
        TEST_COMMANDS.some(cmd =>
          (t.summary + (t.detail || "")).includes(cmd)
        )
      );

      if (!hasBuildTool) {
        return {
          id: "ev_avoid",
          severity: "warning",
          category: "tool_avoidance",
          assertion: `${codePatches.length} code patche(s) applied without verification tools`,
          observation: "Code files were modified but no build, compile, or test command was executed. Expected: cargo build/test for Rust, npm test for JS/TS, pytest for Python, etc.",
          evidence_chain: codePatches.map((p, i) =>
            `${p.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} — ${p.summary}`
          ),
        };
      }
      return null;
    },
  },
];

// ── Run all rules against event stream ─────────────────────────────────

export function detectIntegrity(events: SessionEvent[]): {
  evidence: Evidence[];
  status: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "CONFLICTED";
  warningCount: number;
  criticalCount: number;
} {
  const evidence: Evidence[] = [];
  for (const rule of rules) {
    const result = rule.match(events);
    if (result) {
      evidence.push(result);
    }
  }

  const criticals = evidence.filter(e => e.severity === "critical").length;
  const warnings = evidence.filter(e => e.severity === "warning").length;

  let status: "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "CONFLICTED";
  if (criticals > 0) status = "CONFLICTED";
  else if (warnings > 1) status = "PARTIAL";
  else if (warnings === 1) status = "UNVERIFIED";
  else status = "VERIFIED";

  return { evidence, status, warningCount: warnings, criticalCount: criticals };
}
