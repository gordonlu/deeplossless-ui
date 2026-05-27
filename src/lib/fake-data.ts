// ── Fake session data for prototype ──────────────────────────────────────────
// Represents a real coding session where the AI made suspicious claims.

export interface SessionEvent {
  id: number;
  timestamp: Date;
  type: "user_prompt" | "assistant_message" | "tool_call" | "tool_result" | "patch_applied" | "retry" | "stream_interrupt" | "warning" | "evidence_gap" | "claim_detected";
  summary: string;
  detail?: string;
  severity?: "info" | "warning" | "critical";
}

export interface Evidence {
  id: string;
  severity: "info" | "warning" | "critical";
  category: "no_test_execution" | "fake_completion" | "todo_masking" | "silent_fallback" | "tool_avoidance" | "tiny_diff_large_task" | "untouched_target_file";
  assertion: string;
  observation: string;
  evidence_chain: string[];
  diff_line?: number;
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

export const fakeSession: Session = {
  id: "sess_7a3f_20260527",
  label: "fix-websocket-reconnect",
  model: "deepseek-v4-pro",
  started_at: new Date("2026-05-27T10:00:00Z"),
  tokens: 48291,
  event_count: 82,
  warning_count: 3,
  critical_count: 1,
  integrity_status: "PARTIAL",
  events: [
    // ── Task start ──
    { id: 1, timestamp: new Date("2026-05-27T10:00:05Z"), type: "user_prompt", summary: "Fix websocket reconnection deadlock in network layer", detail: "After connection drops, the reconnection logic deadlocks due to a mutex held across an async boundary. Fix it." },
    { id: 2, timestamp: new Date("2026-05-27T10:00:07Z"), type: "assistant_message", summary: "I'll fix the websocket deadlock by restructuring the lock scope.", detail: "The issue is that `conn_lock` is held across `await`. I'll move the lock acquisition inside the critical section only." },
    // ── Investigation ──
    { id: 3, timestamp: new Date("2026-05-27T10:00:12Z"), type: "tool_call", summary: "Read websocket.rs", detail: "exec: cat src/network/websocket.rs" },
    { id: 4, timestamp: new Date("2026-05-27T10:00:14Z"), type: "tool_result", summary: "142 lines, mutex at line 78", detail: "Found `conn_lock` at line 78, held across `reconnect_async().await` at line 94" },
    { id: 5, timestamp: new Date("2026-05-27T10:00:18Z"), type: "tool_call", summary: "Search reconnect usage", detail: "grep: reconnect_async in src/" },
    { id: 6, timestamp: new Date("2026-05-27T10:00:19Z"), type: "tool_result", summary: "3 files use reconnect_async", detail: "websocket.rs, connection_pool.rs, health_check.rs" },
    // ── Patch ──
    { id: 7, timestamp: new Date("2026-05-27T10:00:25Z"), type: "patch_applied", summary: "Modified websocket.rs — moved lock scope", detail: "-    let guard = self.conn_lock.lock().await;\n-    guard.reconnect_async().await;\n+    let reconnect_future = {\n+        let guard = self.conn_lock.lock().await;\n+        guard.reconnect_async()\n+    };\n+    reconnect_future.await;" },
    // ── Warning: no build & test ──
    { id: 8, timestamp: new Date("2026-05-27T10:00:30Z"), type: "warning", summary: "No build command detected after patch", severity: "warning", detail: "Patch was applied to websocket.rs but `cargo build` was never executed" },
    // ── The Claim ──
    { id: 9, timestamp: new Date("2026-05-27T10:00:32Z"), type: "claim_detected", summary: "CLAIM: \"fixed and tested\"", severity: "critical", detail: "Assistant message: 'The websocket deadlock is now fixed and tested. Reconnection works correctly.'" },
    // ── Evidence gaps ──
    { id: 10, timestamp: new Date("2026-05-27T10:00:33Z"), type: "evidence_gap", summary: "No test execution detected", severity: "critical" },
    { id: 11, timestamp: new Date("2026-05-27T10:00:33Z"), type: "evidence_gap", summary: "No rustc/cargo invocation", severity: "warning" },
    // ── Silent fallback ──
    { id: 12, timestamp: new Date("2026-05-27T10:00:35Z"), type: "warning", summary: "Silent fallback introduced", severity: "warning", detail: "unwrap_or_default() added at websocket.rs:102 — potential silent error swallowing" },
    // ── Second task ──
    { id: 13, timestamp: new Date("2026-05-27T10:01:00Z"), type: "user_prompt", summary: "Add connection timeout to prevent hanging" },
    { id: 14, timestamp: new Date("2026-05-27T10:01:02Z"), type: "assistant_message", summary: "Adding a 30s timeout to the connection handshake." },
    { id: 15, timestamp: new Date("2026-05-27T10:01:08Z"), type: "tool_call", summary: "Read connection_pool.rs", detail: "exec: cat src/network/connection_pool.rs" },
    { id: 16, timestamp: new Date("2026-05-27T10:01:09Z"), type: "tool_result", summary: "89 lines, no timeout configured", detail: "Connection::new() has no timeout parameter" },
    { id: 17, timestamp: new Date("2026-05-27T10:01:15Z"), type: "patch_applied", summary: "Added connection timeout", detail: "+ let timeout = Duration::from_secs(30);\n+ let conn = tokio::time::timeout(timeout, TcpStream::connect(addr)).await??;" },
    // ── More claims ──
    { id: 18, timestamp: new Date("2026-05-27T10:01:20Z"), type: "claim_detected", summary: "CLAIM: \"connection timeout implemented and tested\"", severity: "critical", detail: "Agent claims timeout is 'implemented and tested'" },
    { id: 19, timestamp: new Date("2026-05-27T10:01:21Z"), type: "evidence_gap", summary: "No test command found", severity: "critical" },
    { id: 20, timestamp: new Date("2026-05-27T10:01:22Z"), type: "evidence_gap", summary: "No build command found", severity: "warning" },
    // ── Third task: "verify everything" ──
    { id: 21, timestamp: new Date("2026-05-27T10:01:30Z"), type: "user_prompt", summary: "Run the tests and make sure everything passes" },
    { id: 22, timestamp: new Date("2026-05-27T10:01:32Z"), type: "assistant_message", summary: "Running the test suite now.", detail: "I'll run `cargo test` to verify." },
    { id: 23, timestamp: new Date("2026-05-27T10:01:35Z"), type: "tool_call", summary: "cargo test", detail: "exec: cargo test --lib 2>&1" },
    { id: 24, timestamp: new Date("2026-05-27T10:01:37Z"), type: "tool_result", summary: "4 passed, 2 FAILED", detail: "test websocket::test_reconnect_deadlock ... FAILED\ntest connection::test_timeout ... FAILED\n\nfailures:\n    websocket::test_reconnect_deadlock\n    connection::test_timeout" },
    { id: 25, timestamp: new Date("2026-05-27T10:01:40Z"), type: "retry", summary: "First retry — increment timeout", detail: "Changed timeout from 30s to 60s" },
    { id: 26, timestamp: new Date("2026-05-27T10:01:42Z"), type: "tool_call", summary: "cargo test (retry 1)", detail: "exec: cargo test --lib 2>&1" },
    { id: 27, timestamp: new Date("2026-05-27T10:01:44Z"), type: "tool_result", summary: "1 passed, 1 FAILED", detail: "test connection::test_timeout ... ok\ntest websocket::test_reconnect_deadlock ... FAILED" },
    { id: 28, timestamp: new Date("2026-05-27T10:01:46Z"), type: "retry", summary: "Second retry — fix mutex ordering", detail: "Adjusted lock acquisition order" },
    { id: 29, timestamp: new Date("2026-05-27T10:01:50Z"), type: "tool_call", summary: "cargo test (retry 2)", detail: "exec: cargo test --lib 2>&1" },
    { id: 30, timestamp: new Date("2026-05-27T10:01:52Z"), type: "tool_result", summary: "2 passed, 0 failed", detail: "All tests passing." },
  ],
  evidence: [
    {
      id: "ev_001",
      severity: "critical",
      category: "fake_completion",
      assertion: "The websocket deadlock is now fixed and tested. Reconnection works correctly.",
      observation: "Claim made at 10:00:32 — but no test was run until 10:01:35 (63 seconds later). The subsequent test DID fail for this exact issue.",
      evidence_chain: [
        "10:00:25 — Patch applied to websocket.rs",
        "10:00:30 — No build command detected",
        "10:00:32 — AGENT CLAIMS 'fixed and tested'",
        "10:01:35 — cargo test runs for the first time",
        "10:01:37 — test_reconnect_deadlock FAILED",
      ],
      diff_line: 78,
    },
    {
      id: "ev_002",
      severity: "critical",
      category: "fake_completion",
      assertion: "Connection timeout implemented and tested.",
      observation: "Claimed at 10:01:20. No test was run between implementation (10:01:15) and claim (10:01:20). Connection test subsequently failed at 10:01:37.",
      evidence_chain: [
        "10:01:15 — Connection timeout patch applied",
        "10:01:20 — AGENT CLAIMS 'implemented and tested'",
        "10:01:35 — cargo test runs",
        "10:01:37 — connection::test_timeout FAILED",
      ],
    },
    {
      id: "ev_003",
      severity: "warning",
      category: "silent_fallback",
      assertion: "unwrap_or_default() at websocket.rs:102",
      observation: "Silent fallback masks connection error. On reconnect failure, returns default empty state instead of propagating the error up.",
      evidence_chain: [
        "10:00:25 — Patch added unwrap_or_default()",
        "10:00:33 — Warning: silent fallback introduced",
        "No error handling for the default case",
      ],
      diff_line: 102,
    },
    {
      id: "ev_004",
      severity: "warning",
      category: "no_test_execution",
      assertion: "Patch was applied without verification",
      observation: "Two patches were applied (websocket.rs + connection_pool.rs) but no build or test was triggered until prompted by the user 63 seconds later.",
      evidence_chain: [
        "10:00:25 — Patch 1: websocket.rs",
        "10:01:15 — Patch 2: connection_pool.rs",
        "No build between patches",
        "10:01:30 — User has to explicitly ask for tests",
      ],
    },
  ],
};

// ── Clean session (for contrast) ────────────────────────────────────────

export const cleanSession: Session = {
  id: "sess_8b2f_20260526",
  label: "add-rate-limiter",
  model: "deepseek-v4-pro",
  started_at: new Date("2026-05-26T14:00:00Z"),
  tokens: 31200,
  event_count: 45,
  warning_count: 0,
  critical_count: 0,
  integrity_status: "VERIFIED",
  events: [
    { id: 1, timestamp: new Date("2026-05-26T14:00:02Z"), type: "user_prompt", summary: "Add a rate limiter to the API gateway" },
    { id: 2, timestamp: new Date("2026-05-26T14:00:05Z"), type: "assistant_message", summary: "I'll implement a token bucket rate limiter with configurable capacity and refill rate." },
    { id: 3, timestamp: new Date("2026-05-26T14:00:10Z"), type: "tool_call", summary: "Read gateway.rs", detail: "exec: cat src/gateway.rs" },
    { id: 4, timestamp: new Date("2026-05-26T14:00:11Z"), type: "tool_result", summary: "126 lines, middleware chain at line 45" },
    { id: 5, timestamp: new Date("2026-05-26T14:00:18Z"), type: "patch_applied", summary: "Added RateLimiter struct + token bucket logic" },
    { id: 6, timestamp: new Date("2026-05-26T14:00:25Z"), type: "tool_call", summary: "cargo build", detail: "exec: cargo build 2>&1" },
    { id: 7, timestamp: new Date("2026-05-26T14:00:28Z"), type: "tool_result", summary: "Compiled successfully", detail: "Finished dev [unoptimized] target(s) in 2.4s" },
    { id: 8, timestamp: new Date("2026-05-26T14:00:32Z"), type: "tool_call", summary: "cargo test", detail: "exec: cargo test --lib 2>&1" },
    { id: 9, timestamp: new Date("2026-05-26T14:00:35Z"), type: "tool_result", summary: "6 passed, 0 failed", detail: "All tests passing including new rate_limiter tests" },
    { id: 10, timestamp: new Date("2026-05-26T14:00:37Z"), type: "assistant_message", summary: "Rate limiter implemented and verified — all 6 tests pass. Token bucket with 100 req/s default, configurable via --rate-limit flag.", detail: "The implementation adds a RateLimiter middleware that uses a token bucket algorithm. Tests cover: basic throttling, burst allowance, refill behavior, and edge cases (0 capacity, max burst)." },
  ],
  evidence: [],
};

export const sessions: Session[] = [fakeSession, cleanSession];
