"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import { fakeSession, cleanSession, sessions } from "@/lib/fake-data";
import { detectIntegrity } from "@/lib/rule-engine";
import type { SessionEvent, Evidence } from "@/lib/fake-data";

// ── Narrative phases ────────────────────────────────────────────────────

interface NarrativePhase {
  id: string;
  label: string;
  icon: string;
  content: React.ReactNode;
}

function buildNarrative(session: typeof fakeSession): NarrativePhase[] {
  const detection = detectIntegrity(session.events);
  const criticals = detection.evidence.filter(e => e.severity === "critical");
  const warnings = detection.evidence.filter(e => e.severity === "warning");
  const claims = session.events.filter(e => e.type === "claim_detected");
  const patches = session.events.filter(e => e.type === "patch_applied");
  const tools = session.events.filter(e => e.type === "tool_call");
  const userPrompts = session.events.filter(e => e.type === "user_prompt");
  const retries = session.events.filter(e => e.type === "retry");

  return [
    // Phase 1: Mission Brief
    {
      id: "mission",
      label: "MISSION BRIEF",
      icon: "▼",
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: "2px solid #FCEE0A" }}>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[#7A7A7A] mb-2">Primary Directive</div>
            <div className="text-sm text-[#EAEAEA] font-mono leading-relaxed">
              {userPrompts.map(p => (
                <div key={p.id} className="mb-2">
                  <span className="text-[#7A7A7A]">{p.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                  {" — "}{p.summary}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            {[
              [session.event_count.toString(), "Events"],
              [tools.length.toString(), "Tool Calls"],
              [patches.length.toString(), "Patches"],
              [retries.length.toString(), "Retries"],
            ].map(([val, label]) => (
              <div key={label}>
                <div className="text-lg font-semibold text-[#FCEE0A] font-mono">{val}</div>
                <div className="text-[9px] tracking-wider uppercase text-[#7A7A7A]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    // Phase 2: Signal Trace
    {
      id: "signal",
      label: "EXECUTION SIGNAL",
      icon: "∿",
      content: (
        <div className="space-y-3">
          <div className="relative h-16 flex items-end gap-[3px]">
            {session.events.map((event, i) => {
              const isCritical = event.severity === "critical" || event.type === "claim_detected" || event.type === "evidence_gap";
              const isWarning = event.severity === "warning" || event.type === "retry";
              const isNormal = !isCritical && !isWarning;
              const h = isCritical ? "100%" : isWarning ? "55%" : isNormal ? "20%" : "10%";
              const color = isCritical ? "#FF5454" : isWarning ? "#FFB020" : "#3A3A3A";
              return (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.01, duration: 0.15 }}
                  style={{ width: "3px", height: h, backgroundColor: color, opacity: 0.6 }}
                  title={event.summary}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between font-mono text-[9px] tracking-wider uppercase">
            <span className="text-[#7A7A7A]">{session.events[0]?.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            <div className="flex items-center gap-4">
              <span><span className="text-[#3A3A3A]">▬</span> Normal</span>
              <span><span className="text-[#FFB020]">▬</span> Warning</span>
              <span><span className="text-[#FF5454]">▬</span> Critical</span>
            </div>
            <span className="text-[#7A7A7A]">{session.events[session.events.length - 1]?.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {criticals.length > 0 && (
            <div className="p-3 rounded-sm text-center" style={{ backgroundColor: "#FF545410", border: "1px solid #FF545420" }}>
              <span className="text-[#FF5454] font-mono text-xs tracking-wider">✕ {criticals.length} ANOMALY SPIKES DETECTED</span>
            </div>
          )}
        </div>
      ),
    },

    // Phase 3: Assertion Conflicts
    {
      id: "conflict",
      label: "ASSERTION CONFLICT",
      icon: "⚡",
      content: (
        <div className="space-y-4">
          {claims.map((claim, i) => {
            const relatedEvidence = detection.evidence.filter(ev =>
              ev.evidence_chain.some(step => step.includes(claim.summary))
            );
            return (
              <motion.div
                key={claim.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="grid grid-cols-[1fr_1fr] gap-3"
              >
                <div className="p-3 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: "2px solid #FCEE0A" }}>
                  <div className="font-mono text-[9px] tracking-widest uppercase text-[#7A7A7A] mb-1">Claimed</div>
                  <div className="text-xs text-[#EAEAEA] font-mono">&ldquo;{claim.detail || claim.summary}&rdquo;</div>
                  <div className="text-[9px] text-[#7A7A7A] mt-1">{claim.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                </div>
                <div className="p-3 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: "2px solid #FF5454" }}>
                  <div className="font-mono text-[9px] tracking-widest uppercase text-[#7A7A7A] mb-1">Observed</div>
                  <div className="text-xs text-[#FF5454] font-mono">
                    {relatedEvidence.length > 0
                      ? relatedEvidence[0].observation.slice(0, 120)
                      : "No matching execution evidence found"}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ),
    },

    // Phase 4: Execution Evidence Chain
    {
      id: "evidence",
      label: "EVIDENCE CHAIN",
      icon: "⊘",
      content: (
        <div className="space-y-4">
          {detection.evidence.map((ev, i) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15 }}
              className="p-4 rounded-sm"
              style={{ backgroundColor: "#101114", borderLeft: `2px solid ${ev.severity === "critical" ? "#FF5454" : "#FFB020"}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-sm font-mono text-[9px] tracking-wider uppercase`}
                  style={{ color: ev.severity === "critical" ? "#FF5454" : "#FFB020", backgroundColor: `${ev.severity === "critical" ? "#FF5454" : "#FFB020"}15` }}>
                  {ev.severity}
                </span>
                <span className="font-mono text-[9px] text-[#7A7A7A]">{ev.category}</span>
              </div>
              <div className="space-y-1.5">
                {ev.evidence_chain.map((step, j) => (
                  <div key={j} className="flex items-start gap-2 font-mono text-[11px]">
                    <span className="text-[#FCEE0A] flex-shrink-0">{j + 1}.</span>
                    <span className="text-[#7A7A7A]">{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ),
    },

    // Phase 5: Root Cause
    {
      id: "rootcause",
      label: "ROOT CAUSE",
      icon: "◈",
      content: (
        <div className="space-y-3">
          {criticals.length > 0 ? (
            <div className="p-4 rounded-sm text-center" style={{ backgroundColor: "#101114", border: "1px solid #FF545440" }}>
              <div className="text-[#FF5454] font-mono text-sm tracking-wider mb-1">EXECUTION INTEGRITY: {detection.status}</div>
              <div className="text-[#7A7A7A] font-mono text-[10px]">
                {criticals.length} critical · {warnings.length} warnings
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-sm text-center" style={{ backgroundColor: "#101114", border: "1px solid #00D1B240" }}>
              <div className="text-[#00D1B2] font-mono text-sm tracking-wider mb-1">EXECUTION INTEGRITY: {detection.status}</div>
              <div className="text-[#7A7A7A] font-mono text-[10px]">No anomalies detected</div>
            </div>
          )}

          {/* Pattern summary */}
          {detection.evidence.length > 0 && (
            <div className="space-y-2">
              <div className="font-mono text-[9px] tracking-widest uppercase text-[#7A7A7A]">Detected Patterns</div>
              {detection.evidence.map(ev => (
                <div key={ev.id} className="flex items-center gap-2 font-mono text-[10px]">
                  <span style={{ color: ev.severity === "critical" ? "#FF5454" : "#FFB020" }}>●</span>
                  <span className="text-[#EAEAEA]">{ev.category}</span>
                  <span className="text-[#7A7A7A]">— {ev.observation.slice(0, 80)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];
}

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>();
  const session = sessions.find(s => s.id === id) || sessions[0];
  const phases = useMemo(() => buildNarrative(session), [session]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#0A0A0A", borderColor: "#1C1C1C" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="font-mono text-xs text-[#FCEE0A] hover:underline tracking-wider">◈ DEEP·LOSS·LESS</Link>
          <span className="text-[#7A7A7A]">/</span>
          <span className="font-mono text-xs text-[#EAEAEA] tracking-wider uppercase">EXECUTION CINEMA</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px]">
          <span className="text-[#7A7A7A]">SESSION</span>
          <span className="text-[#EAEAEA]">{session.label}</span>
          <span className={`px-2 py-0.5 rounded-sm tracking-wider ${
            session.integrity_status === "VERIFIED" ? "text-[#00D1B2]" :
            session.integrity_status === "CONFLICTED" ? "text-[#FF5454]" : "text-[#FFB020]"
          }`} style={{ backgroundColor: "#101114" }}>
            {session.integrity_status}
          </span>
        </div>
      </div>

      {/* Narrative scroll */}
      <div className="max-w-3xl mx-auto py-12 px-6 space-y-16">
        {phases.map((phase, idx) => (
          <motion.section
            key={phase.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            {/* Phase header */}
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-xl text-[#FCEE0A]">{phase.icon}</span>
              <span className="font-mono text-xs tracking-[0.3em] uppercase text-[#FCEE0A]">{phase.label}</span>
              <div className="flex-1 border-t ml-3" style={{ borderColor: "#FCEE0A20" }} />
              <span className="font-mono text-[9px] text-[#3A3A3A]">{String(idx + 1).padStart(2, "0")}/{phases.length}</span>
            </div>
            {phase.content}
          </motion.section>
        ))}

        {/* Footer */}
        <div className="text-center pt-8 border-t" style={{ borderColor: "#1C1C1C" }}>
          <Link href="/" className="font-mono text-[10px] text-[#7A7A7A] hover:text-[#FCEE0A] tracking-widest transition-colors">
            [ RETURN TO TRACE VIEWER ]
          </Link>
        </div>
      </div>
    </div>
  );
}
