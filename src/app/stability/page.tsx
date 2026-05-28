"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchCacheStability, fetchSystemPrompts, type StabilityInfo, type SystemPromptEntry, API_BASE } from "@/lib/api";

function DiffLine({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const maxLen = Math.max(oldLines.length, newLines.length);
  const rows: { type: "same" | "added" | "removed" | "changed"; old: string; new: string }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i] || "";
    const n = newLines[i] || "";
    if (o === n) rows.push({ type: "same", old: o, new: n });
    else if (!o) rows.push({ type: "added", old: "", new: n });
    else if (!n) rows.push({ type: "removed", old: o, new: "" });
    else rows.push({ type: "changed", old: o, new: n });
  }

  return (
    <div className="font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto rounded-sm" style={{ backgroundColor: "#0A0A0A" }}>
      {rows.map((r, i) => (
        <div key={i} className="flex" style={{ backgroundColor: r.type === "changed" ? "#FFB02008" : r.type === "added" ? "#00D1B208" : r.type === "removed" ? "#FF545408" : "transparent" }}>
          <span className="w-6 text-right pr-2 flex-shrink-0 text-[#3A3A3A] select-none">{i + 1}</span>
          <span className="flex-1 whitespace-pre-wrap" style={{ color: r.type === "same" ? "#7A7A7A" : r.type === "added" ? "#00D1B2" : r.type === "removed" ? "#FF5454" : "#FFB020" }}>
            {r.type === "changed" ? <>{r.old} → {r.new}</> : r.new || r.old}
          </span>
        </div>
      ))}
    </div>
  );
}

function StabilityContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<StabilityInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<SystemPromptEntry[] | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const sessionParam = searchParams.get("session");
  const [selectedSession, setSelectedSession] = useState<number | null>(sessionParam ? Number(sessionParam) : null);
  const [diffIdx, setDiffIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchCacheStability().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  // Auto-load prompts if session ID provided in URL
  useEffect(() => {
    if (sessionParam) {
      const id = Number(sessionParam);
      setSelectedSession(id);
      loadPrompts(id);
    }
  }, [sessionParam]);

  function loadPrompts(convId: number) {
    setSelectedSession(convId);
    setPromptLoading(true);
    setDiffIdx(null);
    fetchSystemPrompts(convId).then(p => {
      setPrompts(p);
      setPromptLoading(false);
    });
  }

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

        {/* System Prompt Diff */}
        <div className="p-5 rounded-sm border" style={{ backgroundColor: "#101114", borderColor: "#1C1C1C" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xs tracking-widest uppercase text-[#7EB8FF]">System Prompt History</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Session ID"
                value={selectedSession || ""}
                onChange={e => setSelectedSession(e.target.value ? Number(e.target.value) : null)}
                className="w-20 px-2 py-1 rounded-sm font-mono text-xs bg-transparent border outline-none text-[#EAEAEA]"
                style={{ borderColor: "#1C1C1C" }}
                onKeyDown={e => e.key === "Enter" && selectedSession && loadPrompts(selectedSession)}
              />
              <button
                onClick={() => selectedSession && loadPrompts(selectedSession)}
                disabled={promptLoading || !selectedSession}
                className="font-mono text-[11px] text-[#7EB8FF] hover:underline tracking-wider disabled:text-[#3A3A3A]"
              >
                {promptLoading ? "LOADING..." : "LOAD"}
              </button>
            </div>
          </div>
          {prompts && prompts.length > 0 ? (
            <div className="space-y-4">
              <div className="font-mono text-[11px] text-[#7A7A7A]">
                {prompts.length} system prompts ({selectedSession ? `session #${selectedSession}` : ""})
                {prompts.length > 1 && " — click to compare with previous"}
              </div>
              {prompts.map((p, i) => {
                const prev = i > 0 ? prompts[i - 1] : null;
                const isSelected = diffIdx === i;
                const hasChanged = prev && prev.content !== p.content;
                return (
                  <div key={p.id}>
                    <button
                      onClick={() => setDiffIdx(isSelected ? null : i)}
                      className="w-full text-left px-3 py-2 rounded-sm flex items-center gap-3 font-mono text-xs transition-colors hover:bg-[#141414]"
                      style={{ backgroundColor: isSelected ? "#1A1A1A" : "transparent" }}
                    >
                      <span className="text-[#7A7A7A] w-14 flex-shrink-0">{i + 1}/{prompts.length}</span>
                      <span className="text-[#3A3A3A] w-16 flex-shrink-0">{p.stored_at?.slice(11, 19) || "-"}</span>
                      <span className="text-[#EAEAEA] truncate flex-1">{p.content.slice(0, 120)}</span>
                      <span className="text-[#3A3A3A] w-12 text-right">{p.token_count} tok</span>
                      {hasChanged && <span className="text-[#FFB020]">Δ</span>}
                    </button>
                    {isSelected && (
                      <div className="mt-2 space-y-2">
                        {/* Full content */}
                        <div className="p-3 rounded-sm" style={{ backgroundColor: "#0A0A0A" }}>
                          <div className="font-mono text-[11px] text-[#7A7A7A] mb-2">Full Content ({p.token_count} tokens)</div>
                          <div className="font-mono text-[11px] text-[#EAEAEA] whitespace-pre-wrap break-all max-h-60 overflow-y-auto leading-relaxed">
                            {p.content}
                          </div>
                        </div>
                        {/* Diff with previous */}
                        {prev && hasChanged && (
                          <div className="p-3 rounded-sm" style={{ backgroundColor: "#0A0A0A" }}>
                            <div className="font-mono text-[11px] text-[#FFB020] mb-2">Changes from previous</div>
                            <DiffLine oldText={prev.content} newText={p.content} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : prompts && prompts.length === 0 ? (
            <div className="text-xs text-[#3A3A3A] font-mono">No system prompts found for this session.</div>
          ) : (
            <div className="text-xs text-[#3A3A3A] font-mono">Click LOAD to fetch system prompt history.</div>
          )}
        </div>

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

export default function StabilityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A0A0A" }}>
      <div className="font-mono text-sm text-[#7A7A7A]">Loading...</div>
    </div>}>
      <StabilityContent />
    </Suspense>
  );
}
