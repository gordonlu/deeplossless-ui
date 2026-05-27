"use client";

import { motion } from "motion/react";
import type { Evidence, Session } from "@/lib/fake-data";

function SeverityBadge({ severity }: { severity: Evidence["severity"] }) {
  const colors: Record<string, string> = {
    critical: "#FF5454",
    warning: "#FFB020",
    info: "#00D1B2",
  };
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wider uppercase px-2 py-0.5 rounded-sm" style={{ color: colors[severity], backgroundColor: `${colors[severity]}15`, border: `1px solid ${colors[severity]}30` }}>
      <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: colors[severity] }} />
      {severity}
    </span>
  );
}

export function ClaimEvidence({ evidence, onSelectDiff }: { evidence: Evidence[]; onSelectDiff?: (line: number) => void }) {
  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "#1C1C1C" }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tracking-widest uppercase text-[#FCEE0A]">Verification Gap</span>
          <span className="font-mono text-xs text-[#7A7A7A]">{evidence.length} gaps</span>
        </div>
        <span className="font-mono text-xs text-[#7A7A7A]">ASSERTION ↔ OBSERVED EXECUTION</span>
      </div>

      {/* Evidence list */}
      <div className="flex-1 overflow-y-auto">
        {evidence.map((ev, idx) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="border-b p-4 space-y-3"
            style={{ borderColor: "#141414" }}
          >
            {/* Severity + category */}
            <div className="flex items-center gap-2">
              <SeverityBadge severity={ev.severity} />
              <span className="font-mono text-xs text-[#EAEAEA]">{ev.id}</span>
            </div>

            {/* Confrontation: Assertion vs Observation */}
            <div className="grid grid-cols-[1fr_1fr] gap-3">
              {/* Left: Assertion */}
              <div className="p-3 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: "2px solid #FCEE0A" }}>
                <div className="font-mono text-[13px] tracking-widest uppercase text-[#7A7A7A] mb-2">Assertion</div>
                <div className="text-xs text-[#EAEAEA] leading-relaxed font-mono">
                  &ldquo;{ev.assertion}&rdquo;
                </div>
              </div>

              {/* Right: Observed */}
              <div className="p-3 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: `2px solid ${ev.severity === "critical" ? "#FF5454" : "#FFB020"}` }}>
                <div className="font-mono text-[13px] tracking-widest uppercase text-[#7A7A7A] mb-2">Observed Execution</div>
                <div className="text-xs text-[#FF5454] leading-relaxed font-mono">
                  {ev.observation}
                </div>
              </div>
            </div>

            {/* Evidence chain */}
            <div className="pt-1">
              <div className="font-mono text-[13px] tracking-widest uppercase text-[#7A7A7A] mb-2">Evidence Chain</div>
              <div className="space-y-1">
                {ev.evidence_chain.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-xs text-[#FCEE0A] flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <span className="text-[13px] text-[#7A7A7A] font-mono">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Diff link */}
            {ev.diff_line && onSelectDiff && (
              <button
                onClick={() => onSelectDiff(ev.diff_line!)}
                className="inline-flex items-center gap-1.5 font-mono text-xs text-[#FCEE0A] hover:underline"
              >
                <span>→</span> Jump to diff line {ev.diff_line}
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
