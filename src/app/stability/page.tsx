"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { fetchCacheStability, type StabilityInfo, API_BASE } from "@/lib/api";
import { sessions } from "@/lib/fake-data";

export default function StabilityPage() {
  const [data, setData] = useState<StabilityInfo[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCacheStability().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const items = data ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#0A0A0A", borderColor: "#1C1C1C" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="font-mono text-xs text-[#FCEE0A] hover:underline tracking-wider">◈ DEEP·LOSS·LESS</Link>
          <span className="text-[#7A7A7A]">/</span>
          <span className="font-mono text-xs text-[#EAEAEA] tracking-wider uppercase">CACHE STABILITY</span>
        </div>
        <span className="font-mono text-[13px]">
          {loading ? <span className="text-[#7A7A7A]">FETCHING...</span> : data === null ? <span className="text-[#FF5454]">API NOT READY</span> : <span className="text-[#00D1B2]">● LIVE</span>}
        </span>
      </div>

      <div className="max-w-3xl mx-auto py-12 px-6 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="p-5 rounded-sm border" style={{ backgroundColor: "#101114", borderColor: "#FCEE0A30" }}>
            <div className="font-mono text-xs tracking-[0.2em] uppercase text-[#FCEE0A] mb-2">Prompt Cache Stability</div>
            <div className="font-mono text-[13px] text-[#7A7A7A] leading-relaxed">
              DeepSeek uses prefix-based caching. If your system prompt changes between requests, every token
              after the first difference must be recomputed — including the entire conversation history.
              Each unique system prompt hash forces a full cache miss.
            </div>
          </div>
        </motion.div>

        {!loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            {data === null ? (
              <>
                <div className="font-mono text-2xl font-bold text-[#FF5454] tracking-widest mb-3">API NOT READY</div>
                <div className="font-mono text-base text-[#7A7A7A]">Cannot reach deeplossless at</div>
                <div className="font-mono text-lg text-[#FCEE0A] mb-2">{API_BASE}</div>
                <div className="font-mono text-sm text-[#3A3A3A]">Set NEXT_PUBLIC_DEEPLOSSLESS_URL in .env.local to customize.</div>
                <div className="font-mono text-sm text-[#3A3A3A]">Start deeplossless and make a few requests first.</div>
              </>
            ) : items.length === 0 ? (
              <>
                <div className="font-mono text-sm text-[#7A7A7A] mb-2">NO DATA YET</div>
                <div className="font-mono text-xs text-[#3A3A3A]">System prompts are tracked as requests pass through.</div>
                <div className="font-mono text-xs text-[#3A3A3A]">Make a few requests to populate the stability tracker.</div>
              </>
            ) : null}
          </motion.div>
        )}

        {items.map((item) => {
          const pct = item.stability_pct;
          const color = pct >= 80 ? "#00D1B2" : pct >= 50 ? "#FFB020" : "#FF5454";
          return (
            <motion.div
              key={item.conversation_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-5 rounded-sm border"
              style={{ backgroundColor: "#101114", borderColor: "#1C1C1C" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-mono text-xs text-[#EAEAEA]">Conversation #{item.conversation_id}</span>
                  <span className="ml-2 font-mono text-[13px] text-[#7A7A7A]">{item.samples} samples</span>
                </div>
                <span className="font-mono text-sm" style={{ color }}>{pct}%</span>
              </div>

              {/* Heatmap bar */}
              <div className="h-3 rounded-sm mb-3 flex overflow-hidden" style={{ backgroundColor: "#0A0A0A" }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
                <div
                  className="h-full"
                  style={{ width: `${100 - pct}%`, backgroundColor: "#1C1C1C" }}
                />
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 font-mono text-[13px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[#7A7A7A]">Stable ({pct}%)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#1C1C1C" }} />
                  <span className="text-[#7A7A7A]">Mutated ({100 - pct}%)</span>
                </span>
                <span className="flex-1" />
                <span className="text-[#3A3A3A]">{item.unique_hashes} unique / {item.samples} total</span>
              </div>

              {/* Recent hashes mini-display */}
              <div className="mt-3 flex gap-1">
                {item.recent.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 h-5 rounded-sm font-mono text-xs flex items-center justify-center"
                    style={{
                      backgroundColor: i === 0 || (i > 0 && h === item.recent[0]) ? `${color}15` : "#1C1C1C",
                      color: i === 0 || (i > 0 && h === item.recent[0]) ? color : "#3A3A3A",
                    }}
                    title={h}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {/* Advice */}
              {pct < 80 && (
                <div className="mt-3 p-3 rounded-sm font-mono text-xs" style={{ backgroundColor: "#FFB02008", border: "1px solid #FFB02020" }}>
                  <span className="text-[#FFB020]">⚠ Low cache stability.</span>
                  <span className="text-[#7A7A7A] ml-1">
                    {pct < 50
                      ? "Your system prompt changes on nearly every request. Check for timestamps, session IDs, or dynamic instructions."
                      : "Your system prompt has some variability. Look for fields that change between requests."}
                  </span>
                  <span className="text-[#FCEE0A] ml-1">Try: --cache-normalize</span>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Footer */}
        <div className="text-center pt-8 border-t" style={{ borderColor: "#1C1C1C" }}>
          <Link href="/" className="font-mono text-xs text-[#7A7A7A] hover:text-[#FCEE0A] tracking-widest transition-colors">
            [ RETURN TO TRACE VIEWER ]
          </Link>
        </div>
      </div>
    </div>
  );
}
