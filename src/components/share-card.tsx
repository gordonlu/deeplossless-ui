"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";
import type { Session } from "@/lib/fake-data";

export function ShareCard({ session }: { session: Session }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const criticals = session.evidence.filter(e => e.severity === "critical");
  const warnings = session.evidence.filter(e => e.severity === "warning");

  async function exportPng() {
    if (!cardRef.current) return;
    const dataUrl = await toPng(cardRef.current, {
      backgroundColor: "#0A0A0A",
      pixelRatio: 2,
    });
    const link = document.createElement("a");
    link.download = `deeplossless-${session.id}.png`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <div className="space-y-3">
      {/* Export button */}
      <button
        onClick={exportPng}
        className="w-full py-2 font-mono text-xs tracking-widest uppercase rounded-sm border transition-colors hover:opacity-80"
        style={{ color: "#FCEE0A", borderColor: "#FCEE0A30", backgroundColor: "#FCEE0A08" }}
      >
        Export Forensic Report
      </button>

      {/* Card preview (hidden, used for export) */}
      <div
        ref={cardRef}
        className="p-6 space-y-5"
        style={{ backgroundColor: "#0A0A0A", width: "600px", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-lg font-semibold tracking-widest uppercase" style={{ color: "#FCEE0A" }}>
            ◈ deep·loss·less
          </div>
          <div className="text-[10px] tracking-widest uppercase" style={{ color: "#7A7A7A" }}>
            Forensic Execution Report
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: "#1C1C1C" }} />

        {/* Session summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold" style={{ color: "#EAEAEA" }}>{session.event_count}</div>
            <div className="text-[9px] tracking-wider uppercase" style={{ color: "#7A7A7A" }}>Events</div>
          </div>
          <div>
            <div className="text-lg font-semibold" style={{ color: "#FFB020" }}>{session.warning_count}</div>
            <div className="text-[9px] tracking-wider uppercase" style={{ color: "#FFB020" }}>Warnings</div>
          </div>
          <div>
            <div className="text-lg font-semibold" style={{ color: "#FF5454" }}>{session.critical_count}</div>
            <div className="text-[9px] tracking-wider uppercase" style={{ color: "#FF5454" }}>Critical</div>
          </div>
        </div>

        {/* Integrity */}
        <div className="text-center py-2 border rounded-sm" style={{ borderColor: "#FFB02040", backgroundColor: "#FFB02008" }}>
          <span className="text-xs tracking-widest uppercase" style={{ color: "#FFB020" }}>
            INTEGRITY: {session.integrity_status}
          </span>
        </div>

        {/* Key findings */}
        {criticals.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] tracking-widest uppercase" style={{ color: "#FF5454" }}>Critical Findings</div>
            {criticals.map(ev => (
              <div key={ev.id} className="p-3 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: "2px solid #FF5454" }}>
                <div className="text-[10px] font-semibold mb-1" style={{ color: "#FF5454" }}>ASSERTION</div>
                <div className="text-[11px] mb-2" style={{ color: "#EAEAEA" }}>&ldquo;{ev.assertion.slice(0, 80)}&rdquo;</div>
                <div className="text-[10px] font-semibold mb-1" style={{ color: "#FFB020" }}>OBSERVED</div>
                <div className="text-[10px]" style={{ color: "#FF5454" }}>{ev.observation.slice(0, 120)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-3 text-center" style={{ borderColor: "#1C1C1C" }}>
          <div className="text-[9px] tracking-wider" style={{ color: "#3A3A3A" }}>
            github.com/gordonlu/deeplossless
          </div>
        </div>
      </div>
    </div>
  );
}
