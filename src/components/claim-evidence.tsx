"use client";

import { motion } from "motion/react";
import type { Evidence, Session } from "@/lib/types";

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

export function ClaimEvidence({ evidence, sessionId }: { evidence: Evidence[]; sessionId?: string }) {
  const warnings = evidence.filter(e => e.severity === "warning");
  const highConf = evidence.filter(e => e.confidence === "high");
  const observed = evidence.filter(e => e.source === "observed");

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: "#1C1C1C" }}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm tracking-widest uppercase text-[#FCEE0A]">Findings</span>
          <span className="font-mono text-xs text-[#7A7A7A]">{evidence.length} total</span>
        </div>
        <span className="font-mono text-[11px] text-[#3A3A3A] block mt-1">
          {warnings.length} ⚠ · {highConf.length} high conf · {observed.length} observed
        </span>
      </div>

      {/* Quick summary cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {evidence.length === 0 && (
          <div className="text-center py-8 text-xs text-[#3A3A3A] font-mono">
            No findings. Rule engine active.
          </div>
        )}
        {evidence.map((ev) => {
          const color = ev.severity === "critical" ? "#FF5454" : ev.severity === "warning" ? "#FFB020" : "#00D1B2";
          const confColor = ev.confidence === "high" ? "#00D1B2" : ev.confidence === "medium" ? "#FFB020" : "#7A7A7A";
          return (
            <div key={ev.id} className="p-3 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: `2px solid ${color}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs" style={{ color }}>{ev.severity === "critical" ? "✕" : ev.severity === "warning" ? "⚠" : "ℹ"}</span>
                <span className="font-mono text-xs text-[#EAEAEA]">{ev.assertion}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono" style={{ color: confColor }}>{ev.confidence}</span>
                <span className="text-[10px] font-mono text-[#3A3A3A]">{ev.source}</span>
              </div>
            </div>
          );
        })}

        {/* CINEMA link */}
        {evidence.length > 0 && sessionId && (
          <div className="pt-3 text-center">
            <a href={`/replay/${sessionId}`} className="font-mono text-xs text-[#FCEE0A] hover:underline tracking-wider">
              ◈ FULL ANALYSIS →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
