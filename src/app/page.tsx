"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { StatusBar } from "@/components/status-bar";
import { SignalTrace } from "@/components/signal-trace";
import { ClaimEvidence } from "@/components/claim-evidence";
import { ShareCard } from "@/components/share-card";
import { ContextPressure } from "@/components/context-pressure";
import Link from "next/link";
import { type SessionEvent, type Evidence } from "@/lib/types";
import { useSessions } from "@/lib/use-sessions";
import { getLastError } from "@/lib/api";
import { detectIntegrity } from "@/lib/rule-engine";
export default function Home() {
  const { sessions: apiSessions, status: apiStatus, activeIdx, setActiveIdx } = useSessions();
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  // Only show scan intro on first visit.  Must start false for SSR to
  // avoid hydration mismatch — actual value is set in useEffect.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("dl_scan_seen") === "1") {
      setLoaded(true);
    }
  }, []);
  function skipScan() {
    sessionStorage.setItem("dl_scan_seen", "1");
    setLoaded(true);
  }

  const displaySessions = apiSessions.map(s => ({
    id: String(s.id),
    label: `#${s.id}`,
    model: s.model,
    started_at: new Date(),
    tokens: s.total_tokens || 0,
    event_count: s.event_count || s.events.length,
    warning_count: 0,
    critical_count: 0,
    integrity_status: "UNVERIFIED" as const,
    events: s.events.map(e => ({
      id: e.id,
      timestamp: new Date(e.timestamp || Date.now()),
      type: (e.type === "TextDelta" ? "assistant_message" : e.type === "ToolCallStart" ? "tool_call" : e.type === "ToolCallArgsDelta" ? "tool_call" : e.type) as SessionEvent["type"],
      summary: e.summary || e.type,
      detail: e.detail,
      severity: e.severity,
    })),
    evidence: s.evidence as Evidence[],
  }));

  const rawSession = displaySessions[activeIdx] ?? null;
  const detection = useMemo(() => rawSession ? detectIntegrity(rawSession.events) : { evidence: [], status: "UNVERIFIED" as const, warningCount: 0, criticalCount: 0 }, [rawSession]);
  const session = useMemo(() => rawSession ? ({
    ...rawSession,
    evidence: [...rawSession.evidence, ...detection.evidence.filter(
      de => !rawSession.evidence.some(pe => pe.category === de.category)
    )],
    integrity_status: detection.status,
    warning_count: detection.warningCount,
    critical_count: detection.criticalCount,
  }) : null, [rawSession, detection]);

  // Forensic scan intro (~800ms, skippable)
  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A0A0A" }}>
        <div className="space-y-4 font-mono text-xs">
          <ScanLine delay={0} text="INDEXING EVENTS..." color="#7A7A7A" />
          <ScanLine delay={200} text="EXTRACTING PATCHES..." color="#7A7A7A" />
          <ScanLine delay={400} text="DETECTING CLAIMS..." color="#7A7A7A" />
          <ScanLine delay={600} text="MATCHING ASSERTIONS &#x2194; EXECUTION..." color="#FCEE0A" />
          <div className="pt-4">
            <button
              onClick={() => skipScan()}
              className="text-[#7A7A7A] hover:text-[#EAEAEA] transition-colors tracking-widest"
            >
              [ SKIP ]
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A0A0A" }}>
        <div className="text-center space-y-3 font-mono">
          <div className="text-2xl font-bold text-[#FF5454] tracking-widest">API NOT READY</div>
          <div className="text-base text-[#7A7A7A] mt-2">Make requests through deeplossless to see sessions.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Session selector */}
      <div className="border-b px-4 py-1.5 flex items-center gap-2 font-mono text-xs tracking-wider uppercase" style={{ borderColor: "#1C1C1C", backgroundColor: "#080808" }}>
        <span className="text-[#7A7A7A]">SESSIONS</span>
        <select
          value={activeIdx}
          onChange={e => { setActiveIdx(Number(e.target.value)); setSelectedEvent(null); }}
          className="bg-transparent border rounded-sm px-2 py-0.5 font-mono text-xs text-[#EAEAEA] outline-none cursor-pointer"
          style={{ borderColor: "#1C1C1C", maxWidth: "200px" }}
        >
          {displaySessions.map((s, i) => {
            const det = detectIntegrity(s.events);
            const crit = det.criticalCount > 0 ? ` ●${det.criticalCount}` : "";
            return (
              <option key={s.id} value={i} className="bg-[#0A0A0A] text-[#EAEAEA]">
                {s.label} ({s.event_count} ev{crit})
              </option>
            );
          })}
        </select>
        {apiStatus === "live" && (
          <span className="text-[#00D1B2] text-[13px] ml-1">● LIVE</span>
        )}
        {apiStatus === "error" && (
          <span className="text-[#FF5454] text-[13px] ml-1">API NOT READY</span>
        )}
        {apiStatus === "error" && getLastError() && (
          <span className="text-[#FF5454] text-xs ml-2 opacity-70">{getLastError()}</span>
        )}
        <span className="flex-1" />
        <Link href={`/replay/${session.id}`} className="text-[#FCEE0A] hover:underline text-xs tracking-[0.15em] font-semibold mr-4">◈ CINEMA</Link>
        <Link href={`/plan/${session.id}`} className="text-[#FFB020] hover:underline text-xs tracking-[0.15em] font-semibold mr-4">↗ DIVERGENCE</Link>
        <Link href={`/health/${session.id}`} className="text-[#FF5454] hover:underline text-xs tracking-[0.15em] font-semibold mr-4">⚠ CORRUPTION</Link>
        <div className="flex-1" />
        <Link href={`/stability?session=${session.id}`} className="px-3 py-1.5 rounded-sm text-[#00D1B2] hover:underline text-xs tracking-[0.15em] font-bold border" style={{ borderColor: "#00D1B230", backgroundColor: "#00D1B208" }}>⚡ CACHE STABILITY</Link>
        <Link href={`/latency?session=${session.id}`} className="px-3 py-1.5 rounded-sm text-[#7EB8FF] hover:underline text-xs tracking-[0.15em] font-bold border ml-2" style={{ borderColor: "#7EB8FF30", backgroundColor: "#7EB8FF08" }}>∿ LATENCY</Link>
        <Link href="/search" className="px-3 py-1.5 rounded-sm text-[#EAEAEA] hover:underline text-xs tracking-[0.15em] font-bold border ml-2" style={{ borderColor: "#1C1C1C", backgroundColor: "#FFFFFF04" }}>⌕ SEARCH</Link>
      </div>
      <StatusBar session={session} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Context Pressure Dashboard */}
        <div className="w-full lg:w-[360px] flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: "#1C1C1C", maxHeight: "calc(100vh - 120px)" }}>
          <div className="p-3 border-b" style={{ borderColor: "#1C1C1C" }}>
            <ContextPressure sessionId={session.id} />
          </div>
        </div>

        {/* Center: Signal Trace */}
        <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full">
          <SignalTrace events={session.events} totalCount={session.event_count} onSelect={setSelectedEvent} />
        </div>

        {/* Right: Verification + Share */}
        <div className="w-full lg:w-[440px] flex-shrink-0 border-l flex flex-col" style={{ borderColor: "#1C1C1C" }}>
          <div className="p-3 border-b" style={{ borderColor: "#1C1C1C" }}>
            <ShareCard session={session} />
          </div>
          <ClaimEvidence evidence={session.evidence} sessionId={session.id} />
        </div>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="w-full max-w-lg p-6 rounded-sm space-y-4"
            style={{ backgroundColor: "#101114", border: "1px solid #1C1C1C" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tracking-widest uppercase text-[#FCEE0A]">Event Detail</span>
              <button onClick={() => setSelectedEvent(null)} className="text-[#7A7A7A] hover:text-[#EAEAEA]">[X]</button>
            </div>
            <div className="space-y-2 font-mono text-xs">
              <div><span className="text-[#7A7A7A]">ID: </span><span className="text-[#EAEAEA]">{selectedEvent.id}</span></div>
              <div><span className="text-[#7A7A7A]">TIME: </span><span className="text-[#EAEAEA]">{selectedEvent.timestamp.toLocaleString()}</span></div>
              <div><span className="text-[#7A7A7A]">TYPE: </span><span className="text-[#EAEAEA]">{selectedEvent.type}</span></div>
              <div><span className="text-[#7A7A7A]">SUMMARY: </span><span className="text-[#EAEAEA]">{selectedEvent.summary}</span></div>
              {selectedEvent.detail && (
                <div className="p-3 rounded-sm font-mono text-xs whitespace-pre-wrap break-all overflow-auto max-h-60" style={{ backgroundColor: "#0A0A0A", color: "#7A7A7A" }}>
                  {selectedEvent.detail}
                </div>
              )}
              {selectedEvent.severity && (
                <div className="flex items-center gap-2">
                  <span className="text-[#7A7A7A]">SEVERITY: </span>
                  <span style={{ color: selectedEvent.severity === "critical" ? "#FF5454" : "#FFB020" }}>
                    {selectedEvent.severity.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function ScanLine({ delay, text, color }: { delay: number; text: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000, duration: 0.3 }}
      style={{ color }}
    >
      {text}
    </motion.div>
  );
}
