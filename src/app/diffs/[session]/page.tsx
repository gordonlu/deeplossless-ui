"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import { fetchDiffs, fetchDiffOverlaps, type DiffEvent, type DiffOverlap } from "@/lib/api";

export default function DiffTimelinePage() {
  const { session } = useParams<{ session: string }>();
  const [diffs, setDiffs] = useState<DiffEvent[] | null>(null);
  const [overlaps, setOverlaps] = useState<DiffOverlap[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [d, o] = await Promise.all([
        fetchDiffs(session),
        fetchDiffOverlaps(session),
      ]);
      setDiffs(d);
      setOverlaps(o);
      setLoading(false);
    }
    load();
  }, [session]);

  // Group diffs by file_path
  const files = new Map<string, DiffEvent[]>();
  if (diffs) {
    for (const d of diffs) {
      const list = files.get(d.file_path) || [];
      list.push(d);
      files.set(d.file_path, list);
    }
  }
  const fileNames = Array.from(files.keys()).sort();

  // Overlap set for highlighting
  const overlapToolIds = new Set<string>();
  if (overlaps) {
    for (const o of overlaps) {
      overlapToolIds.add(o.first.tool_call_id);
      overlapToolIds.add(o.second.tool_call_id);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="border-b px-4 py-1.5 flex items-center gap-2 font-mono text-xs tracking-wider uppercase"
        style={{ borderColor: "#1C1C1C", backgroundColor: "#080808" }}>
        <Link href="/" className="text-[#FCEE0A] hover:underline mr-4">← HOME</Link>
        <span className="text-[#7A7A7A]">FILE DIFFS</span>
        <span className="text-[#3A3A3A]">/</span>
        <span className="text-[#EAEAEA]">{session.slice(0, 16)}</span>
      </div>

      <div className="p-4 max-w-5xl mx-auto">
        {loading && <div className="text-center py-12 text-[#FCEE0A] font-mono text-xs">LOADING...</div>}

        {!loading && diffs && diffs.length === 0 && (
          <div className="text-center py-12 text-[#7A7A7A] font-mono text-xs">No file diffs recorded for this session.</div>
        )}

        {!loading && diffs && (
          <>
            {/* Overlap warnings */}
            {overlaps && overlaps.length > 0 && (
              <div className="mb-4 p-3 rounded-sm border font-mono text-xs" style={{ borderColor: "#FFB02030", backgroundColor: "#FFB02008" }}>
                <div className="text-[#FFB020] font-bold tracking-wider mb-2">OVERLAPPING EDITS ({overlaps.length})</div>
                {overlaps.map((o, i) => (
                  <div key={i} className="text-[#EAEAEA]">
                    {o.first.file_path} L{o.first.lines} — {o.first.tool_call_id.slice(0, 12)} &harr; {o.second.tool_call_id.slice(0, 12)}
                  </div>
                ))}
              </div>
            )}

            {/* File selector */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setSelectedFile(null)}
                className={`px-2 py-1 rounded-sm font-mono text-xs border ${!selectedFile ? "text-[#FCEE0A]" : "text-[#7A7A7A]"}`}
                style={{ borderColor: !selectedFile ? "#FCEE0A40" : "#1C1C1C" }}
              >
                ALL ({diffs.length})
              </button>
              {fileNames.map(f => {
                const count = files.get(f)?.length || 0;
                return (
                  <button key={f} onClick={() => setSelectedFile(f)}
                    className={`px-2 py-1 rounded-sm font-mono text-xs border ${selectedFile === f ? "text-[#00D1B2]" : "text-[#7A7A7A]"}`}
                    style={{ borderColor: selectedFile === f ? "#00D1B240" : "#1C1C1C" }}
                  >
                    {f.split("/").pop()} ({count})
                  </button>
                );
              })}
            </div>

            {/* Timeline */}
            <div className="space-y-1 font-mono text-xs">
              {(diffs || [])
                .filter(d => !selectedFile || d.file_path === selectedFile)
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((d, i) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="py-2 px-3 rounded-sm flex items-start gap-3"
                    style={{
                      backgroundColor: i % 2 === 0 ? "#0C0C0C" : "transparent",
                      borderLeft: overlapToolIds.has(d.tool_call_id) ? "2px solid #FFB020" : "2px solid transparent",
                    }}
                  >
                    {/* Change type badge */}
                    <span className="px-1.5 py-0.5 rounded-sm whitespace-nowrap" style={{
                      backgroundColor: changeColorBg(d.change_type),
                      color: changeColor(d.change_type),
                    }}>
                      {d.change_type.toUpperCase()}
                    </span>

                    {/* File + lines */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link
                          href={`/diffs/${session}/${encodeURIComponent(d.file_path)}`}
                          className="text-[#00D1B2] hover:underline truncate"
                        >
                          {d.file_path.split("/").pop()}
                        </Link>
                        <span className="text-[#3A3A3A] text-[10px]">
                          L{d.start_line}-{d.end_line}
                        </span>
                        <span className="text-[#7A7A7A] text-[10px] ml-auto">
                          {d.tool_call_id.slice(0, 14)}
                        </span>
                      </div>
                      <div className="text-[#3A3A3A] text-[10px] leading-tight line-clamp-2">
                        {d.before_snippet?.slice(0, 60) || "..."} &rarr; {d.after_snippet?.slice(0, 60) || "..."}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function changeColor(t: string): string {
  switch (t) { case "Insert": return "#00D1B2"; case "Delete": return "#FF5454"; case "Replace": return "#FFB020"; default: return "#7A7A7A"; }
}
function changeColorBg(t: string): string {
  switch (t) { case "Insert": return "#00D1B210"; case "Delete": return "#FF545410"; case "Replace": return "#FFB02010"; default: return "#1C1C1C"; }
}
