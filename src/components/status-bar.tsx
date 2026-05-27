"use client";

import { motion } from "motion/react";
import type { Session } from "@/lib/types";

function StatusBadge({ status }: { status: string }) {
  const color = status === "VERIFIED" ? "#00D1B2" : status === "PARTIAL" ? "#FFB020" : status === "CONFLICTED" ? "#FF5454" : "#7A7A7A";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs" style={{ color }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      {status}
    </span>
  );
}

export function StatusBar({ session }: { session: Session }) {
  return (
    <header
      className="sticky top-0 z-50 border-b px-6 py-2.5 flex items-center justify-between font-mono text-xs tracking-wider uppercase"
      style={{ backgroundColor: "#0A0A0A", borderColor: "#1C1C1C" }}
    >
      {/* Left: session identity */}
      <div className="flex items-center gap-6">
        <span className="text-[#FCEE0A] font-semibold">deep·loss·less</span>
        <span className="text-[#EAEAEA]">{session.label}</span>
        <span className="text-[#7A7A7A]">/{session.model}</span>
      </div>

      {/* Center: runtime stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="text-[#7A7A7A]">TRACE</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#00D1B2", boxShadow: "0 0 6px #00D1B2" }} />
          <span className="text-[#00D1B2]">LIVE</span>
        </div>
        <div>
          <span className="text-[#7A7A7A]">TOKENS </span>
          <span className="text-[#EAEAEA]">{session.tokens.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[#7A7A7A]">EVENTS </span>
          <span className="text-[#EAEAEA]">{session.event_count}</span>
        </div>
        <div>
          <span className="text-[#FFB020]">WARN {session.warning_count}</span>
        </div>
        <div>
          <span className="text-[#FF5454]">CRIT {session.critical_count}</span>
        </div>
      </div>

      {/* Right: integrity */}
      <div className="flex items-center gap-3">
        <span className="text-[#7A7A7A]">INTEGRITY</span>
        <StatusBadge status={session.integrity_status} />
      </div>
    </header>
  );
}
