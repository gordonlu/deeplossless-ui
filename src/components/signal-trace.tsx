"use client";

import { useState, useMemo } from "react";

import type { SessionEvent } from "@/lib/types";

interface Burst {
  id: number;
  timestamp: Date;
  type: "burst";
  summary: string;
  count: number;
  children: SessionEvent[];
}
type DisplayItem = SessionEvent | Burst;

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
    case "exec_result": return "✓";
    case "exec_start": return "▷";
    case "exec_failed": return "✗";
    case "inspection": return "◎";
    case "read": return "◈";
    case "verification": return "✓";
    case "build": return "⚙";
    case "validation": return "⇔";
    case "mutation": return "✎";
    case "network": return "↗";
    case "exec": return "▶";
    default: return "·";
  }
}

function burstLabel(type: string, count: number): string {
  switch (type) {
    case "inspection": return `Inspection burst — ${count} searches`;
    case "read": return `Read burst — ${count} files`;
    case "verification": return `Verification burst — ${count} tests`;
    case "build": return `Build burst — ${count} compiles`;
    case "mutation": return `Mutation burst — ${count} edits`;
    case "network": return `Network burst — ${count} requests`;
    case "exec": return `Execution burst — ${count} commands`;
    case "validation": return `Validation burst — ${count} checks`;
    case "tool_result": return `Tool burst — ${count} results`;
    case "retry": return `Retry burst — ${count} attempts`;
    default: return `${type} ×${count}`;
  }
}

/// Fold consecutive same-type events into burst groups.
function foldBursts(events: SessionEvent[]): DisplayItem[] {
  if (events.length === 0) return [];
  const result: DisplayItem[] = [];
  let i = 0;
  while (i < events.length) {
    const current = events[i];
    // Only fold repetitive types
    const groupTypes = ["inspection", "read", "verification", "build", "validation", "mutation", "network", "exec", "exec_result", "tool_result", "tool_call", "retry"];
    const canFold = groupTypes.includes(current.type);
    if (!canFold) {
      result.push(current);
      i++;
      continue;
    }
    let j = i + 1;
    while (j < events.length && events[j].type === current.type) { j++; }
    const count = j - i;
    if (count >= 3) {
      result.push({ id: current.id, timestamp: current.timestamp, type: "burst" as const, summary: burstLabel(current.type, count), count, children: events.slice(i, j) });
    } else {
      for (let k = i; k < j; k++) result.push(events[k]);
    }
    i = j;
  }
  return result;
}

export function SignalTrace({ events, totalCount, onSelect }: { events: SessionEvent[]; totalCount?: number; onSelect: (e: SessionEvent) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [expandedBurst, setExpandedBurst] = useState<number | null>(null);
  const items = useMemo(() => foldBursts(events), [events]);
  const criticalPoints = events.filter(e => e.severity === "critical" || e.type === "claim_detected" || e.type === "evidence_gap");
  const warningPoints = events.filter(e => e.severity === "warning" || e.type === "retry");

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Signal header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "#1C1C1C" }}>
        <span className="font-mono text-xs tracking-widest uppercase text-[#7A7A7A]">Signal Trace</span>
        <span className="font-mono text-xs text-[#FCEE0A]">
          {totalCount ? `${totalCount} TOTAL · ` : ""}{events.length} RECENT
        </span>
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
                <button
                  key={event.id}
                  onClick={() => { setSelected(event.id); onSelect(event); }}
                  className="relative group hover:opacity-100"
                  style={{ width: "3px", height: h, backgroundColor: severityColor(event.severity), opacity: selected === event.id ? 1 : 0.5 }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                    <div className="px-2 py-1 rounded text-xs font-mono whitespace-nowrap" style={{ backgroundColor: "#1C1C1C", color: "#EAEAEA", border: "1px solid #2A2A2A" }}>
                      {event.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} {eventIcon(event.type)} {event.summary.slice(0, 40)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Event timeline */}
        <div className="space-y-0.5">
          {items.map((item) => {
            const isBurst = item.type === "burst";
            if (isBurst) {
              const b = item as Burst;
              const expanded = expandedBurst === b.id;
              return (
                <div key={b.id}>
                  <button
                    onClick={() => setExpandedBurst(expanded ? null : b.id)}
                    className="w-full text-left px-3 py-1.5 rounded-sm flex items-center gap-3 font-mono transition-colors hover:bg-[#141414]"
                    style={{ backgroundColor: expanded ? "#1A1A1A" : "transparent" }}
                  >
                    <span className="text-xs w-4 text-center text-[#7A7A7A]">≡</span>
                    <span className="text-xs text-[#7A7A7A] w-16 flex-shrink-0">
                      {b.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className="text-xs flex-1 text-[#FCEE0A] font-semibold">
                      {b.summary}
                      <span className="text-[#7A7A7A] ml-2 font-normal">({b.count} events)</span>
                    </span>
                    <span className="text-[#7A7A7A] text-[10px]">{expanded ? "▲" : "▼"}</span>
                  </button>
                  {expanded && (
                    <div className="ml-6 pl-4 border-l" style={{ borderColor: "#1C1C1C" }}>
                      {b.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => { setSelected(child.id); onSelect(child); }}
                          className={`w-full text-left px-3 py-1 rounded-sm flex items-center gap-3 font-mono transition-colors hover:bg-[#141414] ${
                            selected === child.id ? "ring-1 ring-[#FCEE0A]/30 bg-[#1A1A1A]" : ""
                          }`}
                        >
                          <span className="text-xs w-4 text-center" style={{ color: severityColor(child.severity) }}>
                            {eventIcon(child.type)}
                          </span>
                          <span className="text-xs text-[#7A7A7A] w-14 flex-shrink-0">
                            {child.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <span className="text-xs truncate flex-1 text-[#7A7A7A]">{child.summary}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            const event = item as SessionEvent;
            return (
              <button
                key={event.id}
                onClick={() => { setSelected(event.id); onSelect(event); }}
                className={`w-full text-left px-3 py-1.5 rounded-sm flex items-center gap-3 font-mono transition-colors hover:bg-[#141414] ${
                  selected === event.id ? "ring-1 ring-[#FCEE0A]/30 bg-[#1A1A1A]" : ""
                }`}
              >
                <span className="text-xs w-4 text-center" style={{ color: severityColor(event.severity) }}>
                  {eventIcon(event.type)}
                </span>
                <span className="text-xs text-[#7A7A7A] w-16 flex-shrink-0">
                  {event.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className="text-xs truncate flex-1 min-w-0" style={{ color: event.severity === "critical" ? "#FF5454" : event.severity === "warning" ? "#FFB020" : "#EAEAEA" }}>
                  {event.summary}
                </span>
                {event.severity && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: severityColor(event.severity) }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
