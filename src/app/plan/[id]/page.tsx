"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";

interface PlanData {
  id: number;
  goal: string;
  pending_steps: string[];
  assumptions: string[];
}

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:8081/v1/lcm/plan/${id}`).then(r => r.json()).then(d => {
      if (d.id) setPlan(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const total = plan ? plan.pending_steps.length : 0;
  const done = 0; // real API doesn't track step completion yet
  const missed = total - done;
  const divergencePct = total > 0 ? Math.round((missed / total) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      <div className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#0A0A0A", borderColor: "#1C1C1C" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="font-mono text-sm text-[#FCEE0A] hover:underline tracking-wider">◈ DEEP·LOSS·LESS</Link>
          <span className="text-[#7A7A7A]">/</span>
          <span className="font-mono text-sm text-[#EAEAEA] tracking-wider uppercase">EXECUTION DIVERGENCE</span>
        </div>
        <span className={`px-2 py-0.5 rounded-sm font-mono text-xs tracking-wider ${divergencePct > 50 ? "text-[#FF5454]" : divergencePct > 25 ? "text-[#FFB020]" : "text-[#00D1B2]"}`} style={{ backgroundColor: "#101114" }}>
          {loading ? "LOADING..." : plan ? `${divergencePct}% DIVERGENCE` : "NO PLAN"}
        </span>
      </div>

      <div className="max-w-2xl mx-auto py-12 px-6 space-y-12">
        {!plan && !loading ? (
          <div className="text-center py-16">
            <div className="font-mono text-xl font-bold text-[#FF5454] tracking-widest mb-3">NO PLAN</div>
            <div className="font-mono text-sm text-[#7A7A7A] mb-3">This session has no active execution plan.</div>
            <div className="p-4 rounded-sm max-w-md mx-auto" style={{ backgroundColor: "#101114", borderLeft: "2px solid #FCEE0A" }}>
              <div className="font-mono text-xs tracking-wider uppercase text-[#FCEE0A] mb-2">How to create a plan</div>
              <div className="font-mono text-xs text-[#7A7A7A] leading-relaxed">
                Ask your agent to create a plan, or POST directly:<br /><br />
                <code className="text-[#00D1B2] text-xs break-all">
                  POST /v1/lcm/plan<br />
                  {'{"conv_id":'}{id}{',"goal":"...","steps":["step1","step2"],"assumptions":[]}'}
                </code>
              </div>
            </div>
          </div>
        ) : plan ? (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-sm text-center border" style={{ backgroundColor: "#101114", borderColor: "#FCEE0A30" }}>
              <div className="font-mono text-xs tracking-[0.3em] uppercase text-[#7A7A7A] mb-3">Mission Directive</div>
              <div className="text-lg text-[#EAEAEA] font-mono leading-relaxed">&ldquo;{plan.goal}&rdquo;</div>
            </motion.div>

            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="font-mono text-sm tracking-[0.3em] uppercase text-[#FCEE0A]">Plan Steps</span>
                <div className="flex-1 border-t" style={{ borderColor: "#FCEE0A20" }} />
              </div>
              <div className="space-y-1">
                {(plan.pending_steps || []).map((step, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-4 py-3 px-4 rounded-sm font-mono text-sm" style={{ backgroundColor: i % 2 === 0 ? "#0C0C0C" : "transparent" }}>
                    <span className="text-xs text-[#3A3A3A] w-6 text-right">{i + 1}.</span>
                    <span className="flex-1 text-[#EAEAEA]">{step}</span>
                    <span className="text-[#FFB020] text-xs">PENDING</span>
                  </motion.div>
                ))}
              </div>
              {plan.assumptions.length > 0 && (
                <div className="mt-6 p-4 rounded-sm" style={{ backgroundColor: "#101114", borderLeft: "2px solid #FFB020" }}>
                  <div className="font-mono text-xs tracking-wider uppercase text-[#FFB020] mb-2">Assumptions</div>
                  {plan.assumptions.map((a, i) => (
                    <div key={i} className="font-mono text-xs text-[#7A7A7A]">• {a}</div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        <div className="text-center pt-8 border-t" style={{ borderColor: "#1C1C1C" }}>
          <Link href="/" className="font-mono text-xs text-[#7A7A7A] hover:text-[#FCEE0A] tracking-widest">[ RETURN TO TRACE VIEWER ]</Link>
        </div>
      </div>
    </div>
  );
}
