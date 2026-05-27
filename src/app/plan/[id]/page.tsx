"use client";

import { useParams } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";

// Fake plan vs actual data
const planData = {
  id: "sess_7a3f_20260527",
  goal: "Fix websocket reconnection deadlock in network layer",
  plan: [
    { step: 1, text: "Inspect reconnect logic", outcome: "done" as const },
    { step: 2, text: "Reproduce the deadlock", outcome: "skipped" as const },
    { step: 3, text: "Restructure lock scope to avoid cross-await", outcome: "done" as const },
    { step: 4, text: "Add connection timeout guard", outcome: "diverted" as const },
    { step: 5, text: "Run integration tests", outcome: "missed" as const },
    { step: 6, text: "Verify no regressions", outcome: "missed" as const },
  ],
};

const outcomeConfig = {
  done: { icon: "✓", color: "#00D1B2", label: "EXECUTED" },
  skipped: { icon: "⚠", color: "#FFB020", label: "SKIPPED" },
  diverted: { icon: "↗", color: "#FFB020", label: "DIVERTED" },
  missed: { icon: "✕", color: "#FF5454", label: "MISSED" },
};

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();

  const doneCount = planData.plan.filter(p => p.outcome === "done").length;
  const divergenceCount = planData.plan.filter(p => p.outcome !== "done").length;
  const divergencePct = Math.round((divergenceCount / planData.plan.length) * 100);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#0A0A0A", borderColor: "#1C1C1C" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="font-mono text-xs text-[#FCEE0A] hover:underline tracking-wider">◈ DEEP·LOSS·LESS</Link>
          <span className="text-[#7A7A7A]">/</span>
          <span className="font-mono text-xs text-[#EAEAEA] tracking-wider uppercase">EXECUTION DIVERGENCE</span>
        </div>
        <div className={`px-2 py-0.5 rounded-sm font-mono text-[10px] tracking-wider ${
          divergencePct > 50 ? "text-[#FF5454]" : divergencePct > 25 ? "text-[#FFB020]" : "text-[#00D1B2]"
        }`} style={{ backgroundColor: "#101114" }}>
          {divergencePct}% DIVERGENCE
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-12 px-6 space-y-12">
        {/* Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-sm text-center border" style={{ backgroundColor: "#101114", borderColor: "#FCEE0A30" }}
        >
          <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-[#7A7A7A] mb-3">Mission Directive</div>
          <div className="text-lg text-[#EAEAEA] font-mono leading-relaxed">&ldquo;{planData.goal}&rdquo;</div>
        </motion.div>

        {/* Plan vs Actual */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-[#FCEE0A]">Plan vs Actual</span>
            <div className="flex-1 border-t" style={{ borderColor: "#FCEE0A20" }} />
          </div>

          <div className="space-y-1">
            {planData.plan.map((step, i) => {
              const cfg = outcomeConfig[step.outcome];
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 py-3 px-4 rounded-sm font-mono"
                  style={{
                    backgroundColor: i % 2 === 0 ? "#0C0C0C" : "transparent",
                    opacity: step.outcome === "done" ? 1 : step.outcome === "skipped" ? 0.8 : 0.7,
                  }}
                >
                  {/* Step number */}
                  <span className="text-[10px] text-[#3A3A3A] w-6 text-right">{step.step}.</span>

                  {/* Plan step text */}
                  <span className="flex-1 text-xs text-[#EAEAEA]">{step.text}</span>

                  {/* Outcome */}
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span className="text-[9px] tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Divergence visualization */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-[#FFB020]">Divergence Trace</span>
            <div className="flex-1 border-t" style={{ borderColor: "#FFB02020" }} />
          </div>

          {/* Visual trace */}
          <div className="relative py-6">
            {/* Plan line */}
            <div className="absolute left-0 right-0 top-6 h-px" style={{ backgroundColor: "#FCEE0A30" }} />
            {/* Actual line */}
            <svg className="w-full h-20" viewBox="0 0 600 80" preserveAspectRatio="none">
              {/* Plan baseline */}
              <line x1="0" y1="30" x2="600" y2="30" stroke="#FCEE0A" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
              {/* Actual divergence path */}
              <path
                d="M 0 30 L 80 30 L 120 22 L 180 28 L 240 45 L 300 55 L 360 52 L 420 60 L 500 58 L 600 60"
                fill="none"
                stroke="#FFB020"
                strokeWidth="2"
                opacity="0.8"
              />
              {/* Divergence start marker */}
              <circle cx="100" cy="28" r="3" fill="#FFB020" />
              <text x="100" y="18" fill="#FFB020" fontSize="8" fontFamily="monospace" textAnchor="middle">DIVERGE</text>
            </svg>
            <div className="flex justify-between font-mono text-[8px] text-[#3A3A3A]">
              <span>STEP 1</span>
              <span>STEP 3</span>
              <span>STEP 5</span>
              <span>STEP 6</span>
            </div>
          </div>

          {/* Intent Drift Analysis */}
          <div className="p-4 rounded-sm mt-4" style={{ backgroundColor: "#101114", borderLeft: "2px solid #FFB020" }}>
            <div className="font-mono text-[9px] tracking-widest uppercase text-[#FFB020] mb-2">Intent Drift Detected</div>
            <div className="space-y-1 font-mono text-[10px] text-[#7A7A7A]">
              <div>• Step 2 (Reproduce deadlock) was skipped — agent went straight to patching</div>
              <div>• Step 4 (Connection timeout) diverted from original scope into new feature</div>
              <div>• Steps 5-6 (Tests + verification) were never executed until user intervened</div>
            </div>
          </div>
        </motion.div>

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
