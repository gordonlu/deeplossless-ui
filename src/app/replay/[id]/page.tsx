"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import { fetchSessionEvents } from "@/lib/api";
import { detectIntegrity } from "@/lib/rule-engine";
import { type SessionEvent } from "@/lib/types";
import { mapEventType, classifyTool } from "@/lib/classify";

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [toolCounts, setToolCounts] = useState<{ tool: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const nid = Number(id);
    if (!nid) { setError(true); setLoading(false); return; }
    fetchSessionEvents(nid).then(data => {
      if (data?.events && data.events.length > 0) {
        setTotalCount(data.total);
        setToolCounts(data.tool_counts || []);
        setEvents(data.events.map(e => ({
          id: e.id,
          timestamp: new Date(e.timestamp),
          type: mapEventType(e.type, e.payload) as SessionEvent["type"],
          summary: trySummary(e.payload, e.type),
          detail: e.payload,
          severity: e.type.includes("fail") ? "critical" as const : e.type.includes("completed") ? "info" as const : undefined,
        })));
      } else {
        setError(true);
      }
      setLoading(false);
    });
  }, [id]);

  // Aggregate tool counts by category
  const categoryCounts = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const tc of toolCounts) {
      const category = classifyTool(tc.tool).category;
      cats[category] = (cats[category] || 0) + tc.count;
    }
    return cats;
  }, [toolCounts]);

  const detection = useMemo(() => detectIntegrity(events), [events]);
  const criticals = detection.evidence.filter(e => e.severity === "critical");
  // Semantic counts from classified events
  const totalTools = events.filter(e => ["inspection","exec","read","verification","build","validation","mutation","network"].includes(e.type)).length;
  const inspections = events.filter(e => e.type === "inspection").length;
  const verifications = events.filter(e => e.type === "verification").length;
  const mutations = events.filter(e => e.type === "mutation").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      <div className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#0A0A0A", borderColor: "#1C1C1C" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="font-mono text-sm text-[#FCEE0A] hover:underline tracking-wider">◈ DEEP·LOSS·LESS</Link>
          <span className="text-[#7A7A7A]">/</span>
          <span className="font-mono text-sm text-[#EAEAEA] tracking-wider uppercase">EXECUTION CINEMA</span>
        </div>
        <span className="font-mono text-xs text-[#7A7A7A]">
          {loading ? "FETCHING..." : error ? "ERROR" : `${totalCount} TOTAL · ${Math.min(events.length, 1000)} RECENT`}
        </span>
      </div>

      <div className="max-w-3xl mx-auto py-12 px-6 space-y-16">
        {error ? (
          <div className="text-center py-16">
            <div className="font-mono text-xl font-bold text-[#FF5454] tracking-widest mb-2">NO EVENTS</div>
            <div className="font-mono text-sm text-[#7A7A7A]">This session has no recorded events.</div>
          </div>
        ) : (
          <>
            {/* Mission Brief */}
            <Section num="01" label="EXECUTION OVERVIEW" icon="▼">
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  [String(totalCount), "Total Events"],
                  [String(categoryCounts["mutation"] || 0), "Mutations"],
                  [String(categoryCounts["inspection"] || 0), "Inspections"],
                  [String(categoryCounts["verification"] || 0), "Verifications"],
                  [String(criticals.length), "Anomalies"],
                ].map(([v, l]) => (
                  <div key={l}><div className="text-xl font-semibold text-[#FCEE0A] font-mono">{v}</div><div className="text-[11px] tracking-wider uppercase text-[#7A7A7A]">{l}</div></div>
                ))}
              </div>
            </Section>

            {/* Signal Trace */}
            <Section num="02" label="EXECUTION SIGNAL" icon="∿">
              <div className="relative h-16 flex items-end gap-[3px]">
                {events.map((ev, i) => {
                  const isC = ev.severity === "critical";
                  const isW = ev.severity === "warning";
                  const h = isC ? "100%" : isW ? "55%" : "20%";
                  const c = isC ? "#FF5454" : isW ? "#FFB020" : "#3A3A3A";
                  return <motion.div key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.005 }} style={{ width: "3px", height: h, backgroundColor: c, opacity: 0.6 }} />;
                })}
              </div>
            </Section>

            {/* Evidence */}
            <Section num="04" label="EVIDENCE CHAIN" icon="⊘">
              {detection.evidence.map((ev, i) => (
                <motion.div key={ev.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }} className="p-4 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: `2px solid ${ev.severity === "critical" ? "#FF5454" : "#FFB020"}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-sm font-mono text-[11px] tracking-wider uppercase" style={{ color: ev.severity === "critical" ? "#FF5454" : "#FFB020", backgroundColor: `${ev.severity === "critical" ? "#FF5454" : "#FFB020"}15` }}>{ev.severity}</span>
                    <span className="font-mono text-[11px] text-[#7A7A7A]">{ev.category}</span>
                  </div>
                  {ev.evidence_chain.map((step, j) => (
                    <div key={j} className="flex items-start gap-2 font-mono text-[11px]">
                      <span className="text-[#FCEE0A]">{j + 1}.</span>
                      <span className="text-[#7A7A7A]">{step}</span>
                    </div>
                  ))}
                </motion.div>
              ))}
            </Section>

            {/* Root Cause */}
            <Section num="05" label="ROOT CAUSE" icon="◈">
              <div className="p-4 rounded-sm text-center" style={{ backgroundColor: "#101114", border: `1px solid ${criticals.length > 0 ? "#FF5454" : "#00D1B2"}40` }}>
                <div className="font-mono text-base tracking-wider" style={{ color: criticals.length > 0 ? "#FF5454" : "#00D1B2" }}>
                  EXECUTION INTEGRITY: {detection.status}
                </div>
              </div>
            </Section>
          </>
        )}

        <div className="text-center pt-8 border-t" style={{ borderColor: "#1C1C1C" }}>
          <Link href="/" className="font-mono text-xs text-[#7A7A7A] hover:text-[#FCEE0A] tracking-widest">[ RETURN TO TRACE VIEWER ]</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ num, label, icon, children }: { num: string; label: string; icon: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <div className="flex items-center gap-3 mb-6">
        <span className="font-mono text-xl text-[#FCEE0A]">{icon}</span>
        <span className="font-mono text-sm tracking-[0.3em] uppercase text-[#FCEE0A]">{label}</span>
        <div className="flex-1 border-t ml-3" style={{ borderColor: "#FCEE0A20" }} />
        <span className="font-mono text-xs text-[#3A3A3A]">{num}/05</span>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}

function trySummary(payload: string, kind: string): string {
  try {
    const v = JSON.parse(payload);
    if (typeof v === "string") return v.slice(0, 80);
    if (v.text) return v.text.slice(0, 80);
    return kind;
  } catch { return payload.slice(0, 80) || kind; }
}
