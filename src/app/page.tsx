"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { StatusBar } from "@/components/status-bar";
import { SignalTrace } from "@/components/signal-trace";
import { ClaimEvidence } from "@/components/claim-evidence";
import { DiffEvidence } from "@/components/diff-evidence";
import { ShareCard } from "@/components/share-card";
import Link from "next/link";
import { sessions, type SessionEvent } from "@/lib/fake-data";
import { detectIntegrity } from "@/lib/rule-engine";

type Tab = "trace" | "verification";

export default function Home() {
  const [activeSessionIdx, setActiveSessionIdx] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [activeDiffLine, setActiveDiffLine] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("trace");
  // Only show scan intro on first visit (per browser tab session)
  const [loaded, setLoaded] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("dl_scan_seen") === "1";
    }
    return false;
  });
  function skipScan() {
    sessionStorage.setItem("dl_scan_seen", "1");
    setLoaded(true);
  }

  const rawSession = sessions[activeSessionIdx];
  // Run rule engine on the session events
  const detection = useMemo(() => detectIntegrity(rawSession.events), [rawSession]);
  // Merge rule engine output with pre-crafted evidence
  const session = useMemo(() => ({
    ...rawSession,
    evidence: [...rawSession.evidence, ...detection.evidence.filter(
      de => !rawSession.evidence.some(pe => pe.category === de.category)
    )],
    integrity_status: detection.status,
    warning_count: detection.warningCount,
    critical_count: detection.criticalCount,
  }), [rawSession, detection]);

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

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Session selector */}
      <div className="border-b px-4 py-1.5 flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase" style={{ borderColor: "#1C1C1C", backgroundColor: "#080808" }}>
        <span className="text-[#7A7A7A]">SESSIONS</span>
        {sessions.map((s, i) => {
          const det = detectIntegrity(s.events);
          const statusColor = det.status === "VERIFIED" ? "#00D1B2" : det.status === "CONFLICTED" ? "#FF5454" : "#FFB020";
          return (
            <button
              key={s.id}
              onClick={() => { setActiveSessionIdx(i); setSelectedEvent(null); setActiveDiffLine(null); }}
              className={`px-2 py-0.5 rounded-sm transition-colors ${i === activeSessionIdx ? "" : "text-[#7A7A7A] hover:text-[#EAEAEA]"}`}
              style={i === activeSessionIdx ? { color: statusColor, backgroundColor: `${statusColor}10`, border: `1px solid ${statusColor}30` } : {}}
            >
              {s.label}
              {det.criticalCount > 0 && <span style={{ color: "#FF5454" }}> ●{det.criticalCount}</span>}
            </button>
          );
        })}
        <span className="flex-1" />
        <Link href={`/replay/${session.id}`} className="text-[#FCEE0A] hover:underline text-[10px] tracking-[0.15em] font-semibold mr-4">◈ CINEMA</Link>
        <Link href={`/plan/${session.id}`} className="text-[#FFB020] hover:underline text-[10px] tracking-[0.15em] font-semibold mr-4">↗ DIVERGENCE</Link>
        <Link href={`/health/${session.id}`} className="text-[#FF5454] hover:underline text-[10px] tracking-[0.15em] font-semibold mr-4">⚠ CORRUPTION</Link>
      </div>
      <StatusBar session={session} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left panel */}
        <div className="w-full lg:w-[360px] flex-shrink-0 border-r flex flex-col" style={{ borderColor: "#1C1C1C" }}>
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "#1C1C1C" }}>
            {(["trace", "verification"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-2 font-mono text-[10px] tracking-widest uppercase transition-colors ${
                  activeTab === key ? "border-b text-[#FCEE0A]" : "text-[#7A7A7A] hover:text-[#EAEAEA]"
                }`}
                style={{ borderColor: activeTab === key ? "#FCEE0A" : "transparent" }}
              >
                {key === "trace" ? "Signal Trace" : "Verification"}
              </button>
            ))}
          </div>

          {activeTab === "trace" ? (
            <SignalTrace events={session.events} onSelect={setSelectedEvent} />
          ) : (
            <ClaimEvidence evidence={session.evidence} onSelectDiff={setActiveDiffLine} />
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <DiffEvidence evidence={session.evidence} activeLine={activeDiffLine} />
          <div className="border-t p-4" style={{ borderColor: "#1C1C1C" }}>
            <ShareCard session={session} />
          </div>
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
              <div><span className="text-[#7A7A7A]">TIME: </span><span className="text-[#EAEAEA]">{selectedEvent.timestamp.toISOString()}</span></div>
              <div><span className="text-[#7A7A7A]">TYPE: </span><span className="text-[#EAEAEA]">{selectedEvent.type}</span></div>
              <div><span className="text-[#7A7A7A]">SUMMARY: </span><span className="text-[#EAEAEA]">{selectedEvent.summary}</span></div>
              {selectedEvent.detail && (
                <div className="p-3 rounded-sm font-mono text-[11px] whitespace-pre-wrap" style={{ backgroundColor: "#0A0A0A", color: "#7A7A7A" }}>
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
