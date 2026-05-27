"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { StatusBar } from "@/components/status-bar";
import { SignalTrace } from "@/components/signal-trace";
import { ClaimEvidence } from "@/components/claim-evidence";
import { DiffEvidence } from "@/components/diff-evidence";
import { ShareCard } from "@/components/share-card";
import { fakeSession, type SessionEvent } from "@/lib/fake-data";

type Tab = "trace" | "verification";

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [activeDiffLine, setActiveDiffLine] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("trace");
  const [loaded, setLoaded] = useState(false);

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
              onClick={() => setLoaded(true)}
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
      <StatusBar session={fakeSession} />

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
            <SignalTrace events={fakeSession.events} onSelect={setSelectedEvent} />
          ) : (
            <ClaimEvidence evidence={fakeSession.evidence} onSelectDiff={setActiveDiffLine} />
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <DiffEvidence evidence={fakeSession.evidence} activeLine={activeDiffLine} />
          <div className="border-t p-4" style={{ borderColor: "#1C1C1C" }}>
            <ShareCard session={fakeSession} />
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
