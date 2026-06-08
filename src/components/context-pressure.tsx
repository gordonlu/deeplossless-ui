"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

interface PressureData {
  conversation_id: number;
  empty?: boolean;
  pressure_level: "healthy" | "elevated" | "degrading" | "critical" | "collapse_risk";
  total_request_kb: number;
  total_body_kb: number;
  total_bytes: number;
  message_count: number;
  round_count: number;
  estimated_tokens: number;
  redundancy_pct: number;
  tool_output_ratio: number;
  composition: {
    tool_outputs_pct: number;
    assistant_msgs_pct: number;
    user_msgs_pct: number;
    system_prompt_pct: number;
  };
  top_offenders: Array<{
    source: string;
    size_bytes: number;
    impact: "HIGH" | "MED" | "LOW";
    role: string;
    preview: string;
  }>;
  growth_timeline: Array<{
    round: number;
    request_bytes: number;
    body_bytes: number;
    message_count: number;
    estimated_tokens: number;
    redundancy_pct: number;
  }>;
  semantic_redundancy: {
    total_redundant_bytes: number;
    total_bytes: number;
    description: string;
  };
}

const THRESHOLDS = {
  healthy:     { max: 2_000_000, label: "HEALTHY",       color: "#00D1B2", bg: "#00D1B210", emoji: "●" },
  elevated:    { max: 6_000_000, label: "ELEVATED",      color: "#FCEE0A", bg: "#FCEE0A10", emoji: "●" },
  degrading:   { max: 12_000_000, label: "DEGRADING",     color: "#FFB020", bg: "#FFB02010", emoji: "●" },
  critical:    { max: 20_000_000, label: "CRITICAL",      color: "#FF5454", bg: "#FF545410", emoji: "●" },
};

function fmtKB(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function fmtTokens(n: number): string {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}

export function ContextPressure({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<PressureData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/sessions/${sessionId}/context-pressure`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="p-4 font-mono text-xs text-[#7A7A7A] tracking-wider">
        ANALYZING CONTEXT...
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <div className="p-4 font-mono text-xs text-[#7A7A7A]">
        No context data available.
      </div>
    );
  }

  const level = data.pressure_level === "collapse_risk" ? "critical" : data.pressure_level;
  const t = THRESHOLDS[level as keyof typeof THRESHOLDS] || THRESHOLDS.critical;
  const displayLabel = data.pressure_level === "collapse_risk" ? "☠ COLLAPSE RISK" : t.label;

  const totalRequestBytes = data.total_request_kb * 1024;
  // Thermometer: 0-24MB scale
  const thermoPct = Math.min(100, (totalRequestBytes / 24_000_000) * 100);
  const thermoColor = data.pressure_level === "collapse_risk" ? "#FF5454"
    : level === "critical" ? "#FF5454"
    : level === "degrading" ? "#FFB020"
    : level === "elevated" ? "#FCEE0A"
    : "#00D1B2";

  const growth = data.growth_timeline || [];
  const last3 = growth.slice(-3);

  return (
    <div className="font-mono text-xs space-y-4" style={{ color: "#EAEAEA" }}>
      {/* ── Context Health Card ── */}
      <div className="p-3 rounded-sm border" style={{ borderColor: `${t.color}30`, backgroundColor: t.bg }}>
        <div className="text-[#7A7A7A] tracking-[0.15em] mb-1">CONTEXT HEALTH</div>
        <div className="flex items-center gap-2">
          <span className="text-lg" style={{ color: t.color }}>{t.emoji}</span>
          <span className="text-sm font-bold tracking-[0.15em]" style={{ color: t.color }}>
            {displayLabel}
          </span>
        </div>

        {/* Thermometer bar */}
        <div className="mt-2 h-2 rounded-full relative" style={{ backgroundColor: "#1C1C1C" }}>
          <div className="absolute inset-0 rounded-full flex overflow-hidden">
            {([["#00D1B250", 8.3], ["#FCEE0A50", 16.7], ["#FFB02050", 25], ["#FF545450", 33.3], ["#FF545480", 16.7]] as [string, number][]).map(([c, w], i) => (
              <div key={i} style={{ width: `${w}%`, backgroundColor: c, minWidth: 0 }} />
            ))}
          </div>
          <div
            className="absolute top-0 h-full rounded-full transition-all duration-700"
            style={{ width: `${thermoPct}%`, backgroundColor: thermoColor, opacity: 0.8 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[9px]" style={{ color: "#3A3A3A" }}>
          <span>2MB</span><span>6MB</span><span>12MB</span><span>20MB</span><span>24MB</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div><span className="text-[#7A7A7A]">Req body </span><span className="tabular-nums">{fmtKB(totalRequestBytes)}</span></div>
          <div><span className="text-[#7A7A7A]">Msgs </span><span className="tabular-nums">{data.message_count}</span></div>
          <div><span className="text-[#7A7A7A]">Rounds </span><span className="tabular-nums">{data.round_count}</span></div>
          <div><span className="text-[#7A7A7A]">Tokens </span><span className="tabular-nums">{fmtTokens(data.estimated_tokens)}</span></div>
          <div><span className="text-[#7A7A7A]">Redundancy </span>
            <span className="tabular-nums" style={{ color: data.redundancy_pct > 50 ? "#FF5454" : data.redundancy_pct > 25 ? "#FFB020" : "#00D1B2" }}>
              {data.redundancy_pct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Composition Breakdown ── */}
      <div className="p-3 rounded-sm border" style={{ borderColor: "#1C1C1C", backgroundColor: "#080808" }}>
        <div className="text-[#7A7A7A] tracking-[0.15em] mb-2">COMPOSITION</div>
        {[
          { label: "Tool outputs", pct: data.composition.tool_outputs_pct, color: "#7EB8FF" },
          { label: "Assistant", pct: data.composition.assistant_msgs_pct, color: "#00D1B2" },
          { label: "User", pct: data.composition.user_msgs_pct, color: "#FCEE0A" },
          { label: "System", pct: data.composition.system_prompt_pct, color: "#7A7A7A" },
        ].map(item => (
          <div key={item.label} className="mb-1.5">
            <div className="flex justify-between mb-0.5">
              <span style={{ color: item.color }}>{item.label}</span>
              <span className="tabular-nums text-[#7A7A7A]">{item.pct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ backgroundColor: "#1C1C1C" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, backgroundColor: item.color, opacity: 0.7 }} />
            </div>
          </div>
        ))}
        <div className="text-[9px] text-[#7A7A7A] mt-2">
          Tool output ratio: {data.tool_output_ratio.toFixed(1)}% of total context
        </div>
      </div>

      {/* ── Growth Timeline ── */}
      {last3.length > 0 && (
        <div className="p-3 rounded-sm border" style={{ borderColor: "#1C1C1C", backgroundColor: "#080808" }}>
          <div className="text-[#7A7A7A] tracking-[0.15em] mb-2">GROWTH TREND</div>
          <div className="space-y-1.5">
            {growth.slice(-6).map((r, i) => {
              const isLast = i === growth.slice(-6).length - 1;
              return (
                <div key={r.round} className="flex items-center gap-2">
                  <span className="w-6 text-right tabular-nums text-[#7A7A7A]">R{r.round}</span>
                  <span className="w-16 text-right tabular-nums" style={{ color: isLast ? "#FCEE0A" : "#7A7A7A" }}>
                    {fmtKB(r.request_bytes)}
                  </span>
                  <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "#1C1C1C" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (r.request_bytes / (totalRequestBytes || 1)) * 100)}%`,
                        backgroundColor: isLast ? "#FCEE0A" : "#3A3A3A",
                      }}
                    />
                  </div>
                  {r.redundancy_pct > 0 && (
                    <span className="w-10 text-right tabular-nums text-[9px]" style={{ color: r.redundancy_pct > 30 ? "#FF5454" : "#7A7A7A" }}>
                      {r.redundancy_pct.toFixed(0)}% dup
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top Offenders ── */}
      {data.top_offenders && data.top_offenders.length > 0 && (
        <div className="p-3 rounded-sm border" style={{ borderColor: "#1C1C1C", backgroundColor: "#080808" }}>
          <div className="text-[#7A7A7A] tracking-[0.15em] mb-2">TOP OFFENDERS</div>
          <div className="space-y-2">
            {data.top_offenders.slice(0, 5).map((o, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5" style={{ color: o.impact === "HIGH" ? "#FF5454" : o.impact === "MED" ? "#FFB020" : "#7A7A7A" }}>
                  {o.impact === "HIGH" ? "■" : o.impact === "MED" ? "◆" : "●"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <span className="truncate" style={{ color: o.impact === "HIGH" ? "#FF5454" : "#EAEAEA" }}>{o.source}</span>
                    <span className="ml-2 tabular-nums flex-shrink-0 text-[#7A7A7A]">{fmtKB(o.size_bytes)}</span>
                  </div>
                  <div className="text-[9px] text-[#555] truncate mt-0.5">{o.preview.slice(0, 80)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Semantic Redundancy ── */}
      <div className="p-3 rounded-sm border" style={{
        borderColor: data.redundancy_pct > 50 ? "#FF545430" : data.redundancy_pct > 25 ? "#FFB02030" : "#00D1B230",
        backgroundColor: data.redundancy_pct > 50 ? "#FF545408" : data.redundancy_pct > 25 ? "#FFB02008" : "#00D1B208",
      }}>
        <div className="text-[#7A7A7A] tracking-[0.15em] mb-1">REDUNDANCY</div>
        <div className="text-sm font-bold mb-1 tabular-nums" style={{
          color: data.redundancy_pct > 50 ? "#FF5454" : data.redundancy_pct > 25 ? "#FFB020" : "#00D1B2",
        }}>
          {data.redundancy_pct.toFixed(1)}%
        </div>
        <div className="text-[#7A7A7A] leading-relaxed">{data.semantic_redundancy.description}</div>
      </div>
    </div>
  );
}
