"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { SessionEvent } from "@/lib/fake-data";

function severityColor(s: SessionEvent["severity"]) {
  if (!s) return "#3A3A3A";
  return s === "critical" ? "#FF5454" : s === "warning" ? "#FFB020" : "#00D1B2";
}

function eventIcon(t: SessionEvent["type"]) {
  switch (t) {
    case "user_prompt": return "▼";
    case "assistant_message": return "◆";
    case "tool_call": return "▶";
    case "tool_result": return "◀";
    case "patch_applied": return "◇";
    case "retry": return "↻";
    case "stream_interrupt": return "⏏";
    case "warning": return "⚠";
    case "evidence_gap": return "⊘";
    case "claim_detected": return "✕";
    default: return "·";
  }
}

export function SignalTrace({ events, onSelect }: { events: SessionEvent[]; onSelect: (e: SessionEvent) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  // Group events into signal rows by type
  const criticalPoints = events.filter(e => e.severity === "critical" || e.type === "claim_detected" || e.type === "evidence_gap");
  const warningPoints = events.filter(e => e.severity === "warning" || e.type === "retry");

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Signal header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "#1C1C1C" }}>
        <span className="font-mono text-xs tracking-widest uppercase text-[#7A7A7A]">Signal Trace</span>
        <span className="font-mono text-xs text-[#FCEE0A]">{events.length} EVENTS</span>
      </div>

      {/* Signal canvas */}
      <div className="flex-1 overflow-y-auto px-4 py-3 relative">
        {/* Critical band */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#FF5454" }} />
            <span className="font-mono text-xs tracking-wider uppercase text-[#7A7A7A]">Anomaly Pulse</span>
            <span className="font-mono text-xs text-[#FF5454]">{criticalPoints.length} spikes</span>
          </div>
          <div className="relative h-10 flex items-end gap-[2px]">
            {events.map((event, i) => {
              const isCritical = event.severity === "critical" || event.type === "claim_detected" || event.type === "evidence_gap";
              const isWarning = event.severity === "warning" || event.type === "retry";
              const h = isCritical ? "100%" : isWarning ? "55%" : "15%";
              return (
                <motion.button
                  key={event.id}
                  onClick={() => { setSelected(event.id); onSelect(event); }}
                  className="relative group"
                  style={{ width: "3px", height: h, backgroundColor: severityColor(event.severity), opacity: selected === event.id ? 1 : 0.5 }}
                  whileHover={{ opacity: 1, scaleY: 1.5 }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                    <div className="px-2 py-1 rounded text-xs font-mono whitespace-nowrap" style={{ backgroundColor: "#1C1C1C", color: "#EAEAEA", border: "1px solid #2A2A2A" }}>
                      {event.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} {eventIcon(event.type)} {event.summary.slice(0, 40)}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Event timeline */}
        <div className="space-y-0.5">
          {events.map((event) => (
            <motion.button
              key={event.id}
              onClick={() => { setSelected(event.id); onSelect(event); }}
              className={`w-full text-left px-3 py-1.5 rounded-sm flex items-center gap-3 font-mono transition-colors hover:bg-[#141414] ${
                selected === event.id ? "ring-1 ring-[#FCEE0A]/30 bg-[#1A1A1A]" : ""
              }`}
            >
              {/* Icon */}
              <span className="text-xs w-4 text-center" style={{ color: severityColor(event.severity) }}>
                {eventIcon(event.type)}
              </span>
              {/* Time */}
              <span className="text-xs text-[#7A7A7A] w-14 flex-shrink-0">
                {event.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              {/* Summary */}
              <span className="text-xs truncate flex-1" style={{ color: event.severity === "critical" ? "#FF5454" : event.severity === "warning" ? "#FFB020" : "#EAEAEA" }}>
                {event.summary}
              </span>
              {/* Severity marker */}
              {event.severity && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: severityColor(event.severity) }} />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
