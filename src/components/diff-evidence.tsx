"use client";

import { useState, useRef, useEffect } from "react";
import type { Evidence } from "@/lib/fake-data";

// Fake diff content
const fakeDiffLines = [
  { line: 74, type: "context", content: "    /// Reconnect with backoff strategy" },
  { line: 75, type: "context", content: "    pub async fn reconnect(&self) -> Result<()> {" },
  { line: 76, type: "context", content: "        tracing::info!(\"starting reconnection\");" },
  { line: 77, type: "context", content: "" },
  { line: 78, type: "removed", content: "-       let guard = self.conn_lock.lock().await;" },
  { line: 79, type: "removed", content: "-       guard.reconnect_async().await;" },
  { line: 80, type: "added", content: "+       let reconnect_future = {" },
  { line: 81, type: "added", content: "+           let guard = self.conn_lock.lock().await;" },
  { line: 82, type: "added", content: "+           guard.reconnect_async()" },
  { line: 83, type: "added", content: "+       };" },
  { line: 84, type: "added", content: "+       reconnect_future.await;" },
  { line: 85, type: "context", content: "        Ok(())" },
  { line: 86, type: "context", content: "    }" },
  { line: 87, type: "context", content: "" },
  { line: 88, type: "context", content: "    /// Handle reconnection state transitions" },
  { line: 89, type: "context", content: "    fn handle_state(&self, state: ConnState) -> Result<()> {" },
  { line: 90, type: "context", content: "        match state {" },
  { line: 91, type: "context", content: "            ConnState::Disconnected => {" },
  { line: 92, type: "context", content: "                self.reconnect()" },
  { line: 93, type: "context", content: "            }" },
  { line: 94, type: "context", content: "        }" },
  { line: 95, type: "context", content: "    }" },
  { line: 96, type: "context", content: "" },
  { line: 97, type: "context", content: "    /// Get connection status with fallback" },
  { line: 98, type: "context", content: "    pub fn status(&self) -> ConnStatus {" },
  { line: 99, type: "context", content: "        self.current_status.clone()" },
  { line: 100, type: "context", content: "    }" },
  { line: 101, type: "context", content: "}" },
  { line: 102, type: "removed", content: "-       }).unwrap_or_default();" },
  { line: 103, type: "added", content: "+       }).map_err(|e| {" },
  { line: 104, type: "added", content: "+           tracing::error!(\"connection failed: {}\", e);" },
  { line: 105, type: "added", content: "+           Error::ConnectionFailed(e)" },
  { line: 106, type: "added", content: "+       })?;" },
];

function lineColor(type: string) {
  switch (type) {
    case "added": return { bg: "#0D2B1A", text: "#00D1B2" };
    case "removed": return { bg: "#2B0D0D", text: "#FF5454" };
    default: return { bg: "transparent", text: "#7A7A7A" };
  }
}

export function DiffEvidence({ evidence, activeLine }: { evidence: Evidence[]; activeLine: number | null }) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLine]);

  // Find evidence for the active line
  const lineEvidence = evidence.filter(e => e.diff_line === activeLine);

  return (
    <div className="h-full flex" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Left: Diff */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-3 flex items-center border-b" style={{ borderColor: "#1C1C1C" }}>
          <span className="font-mono text-xs tracking-widest uppercase text-[#7A7A7A]">Diff</span>
          <span className="ml-2 font-mono text-[10px] text-[#FCEE0A]">websocket.rs</span>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-xs">
          {fakeDiffLines.map((dl, i) => {
            const colors = lineColor(dl.type);
            const isActive = dl.line === activeLine;
            const evForLine = evidence.find(e => e.diff_line === dl.line);
            return (
              <div
                key={i}
                ref={isActive ? activeRef : undefined}
                className={`flex hover:brightness-125 transition-colors ${isActive ? "ring-1 ring-[#FCEE0A]/40" : ""}`}
                style={{ backgroundColor: isActive ? `${colors.bg}` : colors.bg }}
              >
                {/* Line number */}
                <span className="w-10 text-right pr-3 flex-shrink-0 select-none text-[10px] pt-[1px]" style={{ color: "#3A3A3A" }}>
                  {dl.line}
                </span>
                {/* Prefix + content */}
                <span className="flex-1 whitespace-pre pt-[1px]" style={{ color: colors.text }}>
                  {dl.content}
                </span>
                {/* Evidence marker */}
                {evForLine && (
                  <span className="px-2 pt-[1px] text-[10px]" style={{ color: evForLine.severity === "critical" ? "#FF5454" : "#FFB020" }}>
                    ⚠ {evForLine.category}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Evidence panel */}
      <div className="w-80 flex-shrink-0 border-l flex flex-col" style={{ borderColor: "#1C1C1C" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "#1C1C1C" }}>
          <span className="font-mono text-xs tracking-widest uppercase text-[#7A7A7A]">Evidence</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {lineEvidence.length === 0 ? (
            <div className="text-xs text-[#3A3A3A] font-mono">
              Click a warning marker in the diff to view evidence.
            </div>
          ) : (
            lineEvidence.map((ev) => (
              <div key={ev.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: ev.severity === "critical" ? "#FF5454" : "#FFB020" }}
                  />
                  <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: ev.severity === "critical" ? "#FF5454" : "#FFB020" }}>
                    {ev.severity}
                  </span>
                </div>
                <p className="text-xs text-[#EAEAEA] leading-relaxed font-mono">
                  {ev.observation}
                </p>
                <div className="pt-2 space-y-1">
                  {ev.evidence_chain.map((step, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[10px] text-[#FCEE0A] flex-shrink-0 font-mono">{i + 1}.</span>
                      <span className="text-[10px] text-[#7A7A7A] font-mono">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
