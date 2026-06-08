"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchDiffs, fetchReconstruct, type DiffEvent } from "@/lib/api";

export default function DiffFilePage() {
  const { session, file } = useParams<{ session: string; file: string }>();
  const filePath = decodeURIComponent(file);
  const [diffs, setDiffs] = useState<DiffEvent[] | null>(null);
  const [reconstructed, setReconstructed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconstructing, setReconstructing] = useState(false);
  const [initial, setInitial] = useState("");

  useEffect(() => {
    fetchDiffs(session, filePath).then(d => { setDiffs(d); setLoading(false); });
  }, [session, filePath]);

  async function doReconstruct() {
    setReconstructing(true);
    const content = await fetchReconstruct(session, filePath, initial || undefined);
    setReconstructed(content);
    setReconstructing(false);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="border-b px-4 py-1.5 flex items-center gap-2 font-mono text-xs tracking-wider uppercase"
        style={{ borderColor: "#1C1C1C", backgroundColor: "#080808" }}>
        <Link href={`/diffs/${session}`} className="text-[#FCEE0A] hover:underline mr-4">← DIFFS</Link>
        <span className="text-[#7A7A7A]">FILE</span>
        <span className="text-[#00D1B2] truncate max-w-md">{filePath}</span>
        {diffs && <span className="text-[#7A7A7A] ml-2">({diffs.length} edits)</span>}
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {loading && <div className="text-center py-12 text-[#FCEE0A] font-mono text-xs">LOADING...</div>}

        {!loading && (
          <>
            {/* Reconstruct panel */}
            <div className="mb-6 p-4 rounded-sm border font-mono text-xs" style={{ borderColor: "#1C1C1C", backgroundColor: "#0C0C0C" }}>
              <div className="text-[#FCEE0A] font-bold tracking-wider mb-2">RECONSTRUCT FILE STATE</div>
              <textarea
                placeholder="Optional: initial file content before any edits..."
                value={initial}
                onChange={e => setInitial(e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A0A] border rounded-sm px-2 py-1 text-[#EAEAEA] outline-none mb-2 font-mono text-xs"
                style={{ borderColor: "#1C1C1C" }}
              />
              <button
                onClick={doReconstruct}
                disabled={reconstructing}
                className="px-3 py-1 rounded-sm font-bold tracking-wider border text-xs"
                style={{
                  backgroundColor: "#00D1B215", borderColor: "#00D1B240", color: "#00D1B2",
                  opacity: reconstructing ? 0.5 : 1,
                }}
              >
                {reconstructing ? "RECONSTRUCTING..." : "RECONSTRUCT"}
              </button>
            </div>

            {/* Reconstructed output */}
            {reconstructed !== null && (
              <div className="mb-6">
                <div className="text-[#00D1B2] font-mono text-xs tracking-wider mb-2">RECONSTRUCTED CONTENT</div>
                <pre className="p-4 rounded-sm font-mono text-xs overflow-x-auto" style={{ backgroundColor: "#0C0C0C", color: "#EAEAEA", borderColor: "#00D1B230", border: "1px solid #00D1B220" }}>
                  {reconstructed || "(empty)"}
                </pre>
              </div>
            )}

            {/* Diff timeline for this file */}
            <div className="text-[#7A7A7A] font-mono text-xs tracking-wider mb-2">EDIT HISTORY</div>
            <div className="space-y-3 font-mono text-xs">
              {(diffs || [])
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((d, i) => (
                  <div key={d.id} className="p-3 rounded-sm border" style={{ borderColor: "#1C1C1C", backgroundColor: i % 2 === 0 ? "#0C0C0C" : "transparent" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-1.5 py-0.5 rounded-sm" style={{
                        backgroundColor: changeBg(d.change_type), color: changeClr(d.change_type),
                      }}>{d.change_type.toUpperCase()}</span>
                      <span className="text-[#3A3A3A]">L{d.start_line}-{d.end_line}</span>
                      <span className="text-[#7A7A7A] ml-auto">{d.tool_call_id.slice(0, 14)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[#FF5454] text-[10px] tracking-wider mb-1">BEFORE</div>
                        <pre className="p-2 rounded-sm text-[#EAEAEA] whitespace-pre-wrap break-all" style={{ backgroundColor: "#0A0A0A" }}>
                          {d.before_snippet || "(empty)"}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[#00D1B2] text-[10px] tracking-wider mb-1">AFTER</div>
                        <pre className="p-2 rounded-sm text-[#EAEAEA] whitespace-pre-wrap break-all" style={{ backgroundColor: "#0A0A0A" }}>
                          {d.after_snippet || "(empty)"}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              {diffs && diffs.length === 0 && (
                <div className="text-center py-8 text-[#7A7A7A]">No diffs for this file.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function changeClr(t: string): string { switch (t) { case "Insert": return "#00D1B2"; case "Delete": return "#FF5454"; case "Replace": return "#FFB020"; default: return "#7A7A7A"; } }
function changeBg(t: string): string { switch (t) { case "Insert": return "#00D1B210"; case "Delete": return "#FF545410"; case "Replace": return "#FFB02010"; default: return "#1C1C1C"; } }
