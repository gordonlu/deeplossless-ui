"use client";

import { useParams } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";

// Fake DAG health data translated to "execution corruption" language
const corruptionData = {
  conversation_id: 18,
  status: "corrupted",
  anomalies: [
    {
      id: "an_001",
      severity: "critical" as const,
      anomaly: "ORPHAN EXECUTION BRANCH",
      dagOriginal: "orphan-parent: node 19441 references non-existent parent 4201",
      explanation: "A summary node was created from source nodes that were later deleted. The DAG now has a dangling reference — the execution lineage is incomplete.",
      evidence: "Node 19441 (level 1 summary) has a parent_id 4201 that no longer exists in the DAG.",
    },
    {
      id: "an_002",
      severity: "warning" as const,
      anomaly: "UNRESOLVED DEPENDENCY CHAIN",
      dagOriginal: "symmetry-broken: parent node 18832 does not list child 19441",
      explanation: "A compacted summary says it summarizes nodes {a, b, c}, but node b's parent_ids don't point back to the summary. The dependency chain is broken in one direction.",
      evidence: "Bidirectional symmetry check failed for node 18832 ↔ 19441.",
    },
    {
      id: "an_003",
      severity: "warning" as const,
      anomaly: "CYCLIC RETRY PATTERN",
      dagOriginal: "cycle: path exists from child 17200 back to parent 18832",
      explanation: "A retry loop created a cyclic dependency in the DAG. The execution path folds back on itself, indicating repeated attempts to fix the same issue via the same approach.",
      evidence: "Path 17200 → 18832 → 17200 detected (depth 2). This corresponds to 3 retry events in the session.",
    },
    {
      id: "an_004",
      severity: "info" as const,
      anomaly: "STALE EXECUTION CACHE",
      dagOriginal: "level-order: node 16001 (L2) child 19441 (L1) — parent level must be >= child",
      explanation: "A higher-level summary node was not updated after its child was compacted. The execution cache is stale.",
      evidence: "Node 16001 (L2) references child 19441 (L1). Parent level should be >= child level.",
    },
  ],
};

const severityStyle = {
  critical: { color: "#FF5454", bg: "#FF545415", border: "#FF545430", icon: "✕" },
  warning: { color: "#FFB020", bg: "#FFB02015", border: "#FFB02030", icon: "⚠" },
  info: { color: "#00D1B2", bg: "#00D1B215", border: "#00D1B230", icon: "ℹ" },
};

export default function HealthPage() {
  const { id } = useParams<{ id: string }>();
  const criticals = corruptionData.anomalies.filter(a => a.severity === "critical");
  const warnings = corruptionData.anomalies.filter(a => a.severity === "warning");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#0A0A0A", borderColor: "#1C1C1C" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="font-mono text-xs text-[#FCEE0A] hover:underline tracking-wider">◈ DEEP·LOSS·LESS</Link>
          <span className="text-[#7A7A7A]">/</span>
          <span className="font-mono text-xs text-[#EAEAEA] tracking-wider uppercase">EXECUTION CORRUPTION</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="text-[#7A7A7A]">CONV</span>
          <span className="text-[#EAEAEA]">{corruptionData.conversation_id}</span>
          <span className="px-2 py-0.5 rounded-sm tracking-wider text-[#FF5454]" style={{ backgroundColor: "#101114" }}>
            {criticals.length} CRITICAL
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-12 px-6 space-y-12">
        {/* Status banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-sm text-center border"
          style={{
            backgroundColor: criticals.length > 0 ? "#FF545408" : "#FFB02008",
            borderColor: criticals.length > 0 ? "#FF545430" : "#FFB02030",
          }}
        >
          <div className="text-3xl mb-2">{criticals.length > 0 ? "⚠" : "⊘"}</div>
          <div className="font-mono text-sm tracking-wider uppercase mb-1" style={{ color: criticals.length > 0 ? "#FF5454" : "#FFB020" }}>
            EXECUTION CORRUPTION DETECTED
          </div>
          <div className="font-mono text-[10px] text-[#7A7A7A]">
            {corruptionData.anomalies.length} anomalies · {criticals.length} critical · {warnings.length} warning
          </div>
        </motion.div>

        {/* Anomaly list */}
        <div className="space-y-6">
          {corruptionData.anomalies.map((anomaly, i) => {
            const style = severityStyle[anomaly.severity];
            return (
              <motion.div
                key={anomaly.id}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-5 rounded-sm"
                style={{ backgroundColor: "#101114", borderLeft: `3px solid ${style.color}` }}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-lg" style={{ color: style.color }}>{style.icon}</span>
                  <span className="font-mono text-xs tracking-[0.2em] uppercase" style={{ color: style.color }}>
                    {anomaly.anomaly}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-sm font-mono text-[8px] tracking-wider uppercase ml-auto"
                    style={{ color: style.color, backgroundColor: style.bg, border: `1px solid ${style.border}` }}
                  >
                    {anomaly.severity}
                  </span>
                </div>

                {/* Explanation */}
                <p className="text-xs text-[#EAEAEA] font-mono leading-relaxed mb-3">
                  {anomaly.explanation}
                </p>

                {/* Evidence */}
                <div className="p-3 rounded-sm" style={{ backgroundColor: "#0A0A0A" }}>
                  <div className="font-mono text-[8px] tracking-wider uppercase text-[#7A7A7A] mb-1">Evidence</div>
                  <div className="font-mono text-[10px] text-[#7A7A7A]">{anomaly.evidence}</div>
                </div>

                {/* DAG original (collapsed by default) */}
                <details className="mt-2">
                  <summary className="font-mono text-[9px] text-[#3A3A3A] cursor-pointer hover:text-[#7A7A7A] tracking-wider uppercase">
                    Raw DAG Diagnostic
                  </summary>
                  <div className="mt-2 p-2 rounded-sm font-mono text-[10px] text-[#555]" style={{ backgroundColor: "#080808" }}>
                    {anomaly.dagOriginal}
                  </div>
                </details>
              </motion.div>
            );
          })}
        </div>

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
