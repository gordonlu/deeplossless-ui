"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

interface HealthData {
  conversation_id: number;
  healthy: boolean;
  issues: string[];
}

function translateIssue(raw: string): { anomaly: string; severity: "critical" | "warning" | "info"; explanation: string; guidance: string } {
  if (raw.startsWith("orphan-parent")) {
    return { anomaly: "ORPHAN EXECUTION BRANCH", severity: "critical", explanation: "A summary node was created from source nodes that were later deleted or compacted. The DAG has a dangling reference — execution lineage is incomplete.", guidance: "This is usually self-healing. The next compaction cycle will re-link these nodes. No manual action needed — these orphans don't affect the model's responses." };
  }
  if (raw.startsWith("orphan-child")) {
    return { anomaly: "MISSING EXECUTION ARTIFACT", severity: "warning", explanation: "A node claims to have children that no longer exist. This happens when child nodes are compacted without updating the parent's child list.", guidance: "Self-healing. The compactor will eventually reconcile these references. The conversation context remains intact — only the internal graph bookkeeping is affected." };
  }
  if (raw.startsWith("level-order")) {
    return { anomaly: "EXECUTION CACHE STALE", severity: "info", explanation: "A summary was created before its children were compacted. The parent has a lower level than some of its children — the cache hierarchy is inverted.", guidance: "Minor bookkeeping issue. Does not affect conversation quality. The compactor will fix this when it next processes this conversation." };
  }
  if (raw.startsWith("symmetry-broken")) {
    return { anomaly: "BROKEN DEPENDENCY CHAIN", severity: "warning", explanation: "Bidirectional parent-child references are inconsistent — node A says B is its child, but B doesn't list A as its parent.", guidance: "This happens during concurrent compaction. The next compaction pass will repair the symmetry. Your session is not impacted." };
  }
  if (raw.startsWith("cycle")) {
    return { anomaly: "CYCLIC RETRY PATTERN", severity: "critical", explanation: "A retry loop has created a cycle — the agent has repeated the same failed approach multiple times.", guidance: "This one matters. The agent may be stuck in a retry loop. Check the session events — if you see 3+ retries of the same tool call with the same arguments, intervene and suggest a different approach." };
  }
  return { anomaly: "UNKNOWN ANOMALY", severity: "info", explanation: raw, guidance: "This is an unrecognized DAG diagnostic. It may indicate a new type of graph corruption or a data format change." };
}

export default function HealthPage() {
  const { id } = useParams<{ id: string }>();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/health/${id}`).then(r => r.json()).then(d => {
      setHealth(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const criticals = health ? health.issues.filter(i => i.startsWith("orphan-parent") || i.startsWith("cycle")) : [];
  const warnings = health ? health.issues.filter(i => i.startsWith("orphan-child") || i.startsWith("symmetry")) : [];
  const infos = health ? health.issues.filter(i => i.startsWith("level-order")) : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      <div className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#0A0A0A", borderColor: "#1C1C1C" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="font-mono text-sm text-[#FCEE0A] hover:underline tracking-wider">◈ DEEP·LOSS·LESS</Link>
          <span className="text-[#7A7A7A]">/</span>
          <span className="font-mono text-sm text-[#EAEAEA] tracking-wider uppercase">EXECUTION CORRUPTION</span>
        </div>
        <span className="font-mono text-xs text-[#7A7A7A]">
          {loading ? "FETCHING..." : health?.healthy ? "HEALTHY" : `${health?.issues.length || 0} ISSUES`}
        </span>
      </div>

      <div className="max-w-2xl mx-auto py-12 px-6 space-y-12">
        {!health && !loading ? (
          <div className="text-center py-16">
            <div className="font-mono text-xl font-bold text-[#FF5454] tracking-widest mb-2">NO DATA</div>
          </div>
        ) : health ? (
          <>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-sm text-center border" style={{ backgroundColor: criticals.length > 0 ? "#FF545408" : "#00D1B208", borderColor: criticals.length > 0 ? "#FF545430" : "#00D1B230" }}>
              <div className="text-3xl mb-2">{health.healthy ? "✓" : "⚠"}</div>
              <div className="font-mono text-base tracking-wider uppercase mb-1" style={{ color: health.healthy ? "#00D1B2" : "#FF5454" }}>
                {health.healthy ? "EXECUTION INTEGRITY VERIFIED" : "EXECUTION CORRUPTION DETECTED"}
              </div>
              <div className="font-mono text-xs text-[#7A7A7A]">{health.issues.length} anomalies · {criticals.length} critical · {warnings.length} warning</div>
            </motion.div>

            {/* Group duplicate anomaly types */}
            {(() => {
              const groups: { anomaly: string; severity: "critical"|"warning"|"info"; explanation: string; guidance: string; count: number; samples: string[] }[] = [];
              for (const raw of health.issues) {
                const t = translateIssue(raw);
                const last = groups[groups.length - 1];
                if (last && last.anomaly === t.anomaly) {
                  last.count++;
                  if (last.samples.length < 5) last.samples.push(raw);
                } else {
                  groups.push({ ...t, count: 1, samples: [raw] });
                }
              }
              return groups.map((g, i) => {
                const color = g.severity === "critical" ? "#FF5454" : g.severity === "warning" ? "#FFB020" : "#00D1B2";
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-5 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: `3px solid ${color}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-lg" style={{ color }}>{g.severity === "critical" ? "✕" : g.severity === "warning" ? "⚠" : "ℹ"}</span>
                      <span className="font-mono text-sm tracking-[0.2em] uppercase" style={{ color }}>{g.anomaly}</span>
                      {g.count > 1 && <span className="font-mono text-xs text-[#7A7A7A] ml-1">×{g.count}</span>}
                      <span className="px-2 py-0.5 rounded-sm font-mono text-xs tracking-wider uppercase ml-auto" style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>{g.severity}</span>
                    </div>
                    <p className="text-sm text-[#EAEAEA] font-mono leading-relaxed mb-3">{g.explanation}</p>
                    <div className="p-3 rounded-sm mb-3" style={{ backgroundColor: "#0A0A0A", borderLeft: "2px solid #00D1B2" }}>
                      <div className="font-mono text-xs tracking-wider uppercase text-[#00D1B2] mb-1">What to do</div>
                      <p className="text-sm text-[#7A7A7A] font-mono leading-relaxed">{g.guidance}</p>
                    </div>
                    {g.samples.length > 0 && (
                      <details>
                        <summary className="font-mono text-xs text-[#3A3A3A] cursor-pointer hover:text-[#7A7A7A] tracking-wider uppercase">
                          Raw Diagnostics ({g.count} occurrences)
                        </summary>
                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                          {g.samples.map((s, j) => (
                            <div key={j} className="p-1 rounded-sm font-mono text-xs text-[#555]" style={{ backgroundColor: "#080808" }}>{s}</div>
                          ))}
                        </div>
                      </details>
                    )}
                  </motion.div>
                );
              });
            })()}

          </>
        ) : null}

        <div className="text-center pt-8 border-t" style={{ borderColor: "#1C1C1C" }}>
          <Link href="/" className="font-mono text-xs text-[#7A7A7A] hover:text-[#FCEE0A] tracking-widest">[ RETURN TO TRACE VIEWER ]</Link>
        </div>
      </div>
    </div>
  );
}
