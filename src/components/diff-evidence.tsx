"use client";

import { useRef, useEffect, useMemo } from "react";
import type { Evidence } from "@/lib/types";
import type { SessionEvent } from "@/lib/types";

interface DiffLine {
  line: number;
  type: "added" | "removed" | "context";
  content: string;
}

function extractDiffFromEvents(events: SessionEvent[]): { lines: DiffLine[]; filename: string } | null {
  // Find patch events and parse their content into diff lines
  const patches = events.filter(e =>
    e.type === "patch_applied" ||
    e.type === "exec_result" ||
    (e.detail && (e.detail.includes("+ ") || e.detail.includes("- ") || e.detail.includes("@@ ")))
  );

  if (patches.length === 0) return null;

  const lines: DiffLine[] = [];
  let filename = "session log";

  for (const patch of patches) {
    if (!patch.detail) continue;
    // Try to extract filename from summary
    const fnMatch = patch.summary.match(/([a-zA-Z0-9_/.]+\.(rs|ts|js|py|go|java|cpp|toml|yaml|json))/);
    if (fnMatch) filename = fnMatch[1];

    const rawLines = patch.detail.split("\n");
    for (let i = 0; i < rawLines.length; i++) {
      const content = rawLines[i];
      if (content.startsWith("+")) {
        lines.push({ line: lines.length + 1, type: "added", content });
      } else if (content.startsWith("-")) {
        lines.push({ line: lines.length + 1, type: "removed", content });
      } else if (content.trim()) {
        lines.push({ line: lines.length + 1, type: "context", content });
      }
    }
  }

  return lines.length > 0 ? { lines: lines.slice(0, 200), filename } : null;
}

function lineColor(type: string) {
  switch (type) {
    case "added": return { bg: "#0D2B1A", text: "#00D1B2" };
    case "removed": return { bg: "#2B0D0D", text: "#FF5454" };
    default: return { bg: "transparent", text: "#7A7A7A" };
  }
}

function extractDiffFromPatches(patches: { role: string; content: string }[]): { lines: DiffLine[]; filename: string } | null {
  if (patches.length === 0) return null;
  const lines: DiffLine[] = [];
  let filename = "patch";
  for (const p of patches) {
    const rawLines = p.content.split("\n");
    for (let i = 0; i < rawLines.length; i++) {
      const content = rawLines[i];
      if (content.startsWith("+")) lines.push({ line: lines.length + 1, type: "added", content });
      else if (content.startsWith("-")) lines.push({ line: lines.length + 1, type: "removed", content });
      else if (content.trim() && !content.startsWith("@")) lines.push({ line: lines.length + 1, type: "context", content });
    }
  }
  return lines.length > 0 ? { lines: lines.slice(0, 300), filename } : null;
}

export function DiffEvidence({ events, evidence, activeLine, patches }: { events: SessionEvent[]; evidence: Evidence[]; activeLine: number | null; patches?: { role: string; content: string }[] | null }) {
  const activeRef = useRef<HTMLDivElement>(null);
  const diffFromEvents = useMemo(() => extractDiffFromEvents(events), [events]);
  const diffFromPatches = useMemo(() => patches ? extractDiffFromPatches(patches) : null, [patches]);
  const diff = diffFromPatches || diffFromEvents;

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLine]);

  const lineEvidence = evidence.filter(e => e.diff_line === activeLine);

  return (
    <div className="h-full flex" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Left: Diff */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-3 flex items-center border-b" style={{ borderColor: "#1C1C1C" }}>
          <span className="font-mono text-xs tracking-widest uppercase text-[#7A7A7A]">Diff</span>
          {diff && <span className="ml-2 font-mono text-xs text-[#FCEE0A]">{diff.filename}</span>}
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-xs">
          {!diff ? (
            <div className="p-8 text-center space-y-2">
              <div className="text-sm text-[#7A7A7A] font-mono">NO CODE DIFF DATA</div>
              <div className="text-xs text-[#3A3A3A]">Diff tracking requires pipeline-level file write interception — coming in v0.7.</div>
              <div className="text-xs text-[#3A3A3A]">For now, code changes appear in the Signal Trace as <span className="text-[#FF5454]">mutation</span> events.</div>
            </div>
          ) : (
            diff.lines.map((dl, i) => {
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
                  <span className="w-10 text-right pr-3 flex-shrink-0 select-none text-xs pt-[1px]" style={{ color: "#3A3A3A" }}>
                    {dl.line}
                  </span>
                  <span className="flex-1 whitespace-pre pt-[1px]" style={{ color: colors.text }}>
                    {dl.content}
                  </span>
                  {evForLine && (
                    <span className="px-2 pt-[1px] text-xs" style={{ color: evForLine.severity === "critical" ? "#FF5454" : "#FFB020" }}>
                      ⚠ {evForLine.category}
                    </span>
                  )}
                </div>
              );
            })
          )}
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
                  <span className="font-mono text-xs tracking-wider uppercase" style={{ color: ev.severity === "critical" ? "#FF5454" : "#FFB020" }}>
                    {ev.severity}
                  </span>
                </div>
                <p className="text-xs text-[#EAEAEA] leading-relaxed font-mono">
                  {ev.observation}
                </p>
                <div className="pt-2 space-y-1">
                  {ev.evidence_chain.map((step, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-xs text-[#FCEE0A] flex-shrink-0 font-mono">{i + 1}.</span>
                      <span className="text-xs text-[#7A7A7A] font-mono">{step}</span>
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
