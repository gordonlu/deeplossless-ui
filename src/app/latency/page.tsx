"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { fetchLatencyRecords, fetchLatencySummary, type LatencyRecord, type LatencySummary } from "@/lib/api";

function LatencySparkline({ records }: { records: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || records.length < 2) return;
    const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(...records, 1);
    const stepX = W / (records.length - 1);
    // Fill area
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i < records.length; i++) {
      ctx.lineTo(i * stepX, H - (records[i] / max) * H);
    }
    ctx.lineTo(W, H);
    ctx.fillStyle = "#FCEE0A10";
    ctx.fill();
    // Line
    ctx.beginPath();
    for (let i = 0; i < records.length; i++) {
      if (i === 0) ctx.moveTo(i * stepX, H - (records[i] / max) * H);
      else ctx.lineTo(i * stepX, H - (records[i] / max) * H);
    }
    ctx.strokeStyle = "#FCEE0A";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Max marker
    ctx.fillStyle = "#FF5454";
    const maxIdx = records.indexOf(max);
    ctx.beginPath();
    ctx.arc(maxIdx * stepX, H - (max / max) * H, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FF5454";
    ctx.font = "9px monospace";
    ctx.fillText(`${max}ms`, maxIdx * stepX + 5, H - (max / max) * H - 3);
  }, [records]);
  return <canvas ref={canvasRef} width={600} height={80} className="w-full" />;
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="p-4 rounded-sm text-center" style={{ backgroundColor: "#101114" }}>
      <div className="font-mono text-xl font-semibold" style={{ color: color || "#FCEE0A" }}>
        {value}
      </div>
      <div className="font-mono text-[11px] tracking-wider uppercase text-[#7A7A7A] mt-1">
        {label}{unit ? ` (${unit})` : ""}
      </div>
    </div>
  );
}

export default function LatencyPage() {
  const [records, setRecords] = useState<LatencyRecord[] | null>(null);
  const [summary, setSummary] = useState<LatencySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchLatencyRecords(200), fetchLatencySummary()]).then(([recs, sum]) => {
      setRecords(recs);
      setSummary(sum);
      setLoading(false);
    });
  }, []);

  const latencies = useMemo(() => records ? records.map(r => r.latency_ms).reverse() : [], [records]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: "#0A0A0A", borderColor: "#1C1C1C" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="font-mono text-sm text-[#FCEE0A] hover:underline tracking-wider">◈ DEEP·LOSS·LESS</Link>
          <span className="text-[#7A7A7A]">/</span>
          <span className="font-mono text-sm text-[#EAEAEA] tracking-wider uppercase">LATENCY</span>
        </div>
        <span className="font-mono text-xs text-[#7A7A7A]">
          {loading ? "FETCHING..." : summary ? `${summary.total} requests` : "NO DATA"}
        </span>
      </div>

      <div className="max-w-5xl mx-auto py-8 px-6 space-y-8">
        {summary && summary.total > 0 && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Avg" value={summary.total === 0 ? "—" : String(summary.avg_ms ?? "—")} unit="ms" color="#00D1B2" />
              <StatCard label="P50" value={summary.total === 0 ? "—" : String(summary.p50_ms ?? "—")} unit="ms" />
              <StatCard label="P95" value={summary.total === 0 ? "—" : String(summary.p95_ms ?? "—")} unit="ms" color={(summary.p95_ms ?? 0) > 5000 ? "#FFB020" : undefined} />
              <StatCard label="P99" value={summary.total === 0 ? "—" : String(summary.p99_ms ?? "—")} unit="ms" color={(summary.p99_ms ?? 0) > 10000 ? "#FF5454" : "#FFB020"} />
              <StatCard label="Max" value={summary.total === 0 ? "—" : String(summary.max_ms ?? "—")} unit="ms" color={(summary.max_ms ?? 0) > 30000 ? "#FF5454" : undefined} />
              <StatCard label="Errors" value={String(summary.upstream_errors ?? 0)} color={(summary.upstream_errors ?? 0) > 0 ? "#FF5454" : "#00D1B2"} />
              <StatCard label="Timeouts" value={String(summary.timeouts_30s_plus ?? 0)} unit="30s+" color={(summary.timeouts_30s_plus ?? 0) > 0 ? "#FF5454" : undefined} />
              <StatCard label="Total" value={String(summary.total ?? 0)} />
            </div>

            {/* Sparkline */}
            <div className="p-4 rounded-sm" style={{ backgroundColor: "#101114" }}>
              <div className="font-mono text-xs tracking-widest uppercase text-[#7A7A7A] mb-3">Latency Trend</div>
              <LatencySparkline records={latencies} />
              <div className="flex justify-between font-mono text-[10px] text-[#3A3A3A] mt-1">
                <span>{records?.[0]?.timestamp}</span>
                <span>latest</span>
              </div>
            </div>

            {/* Recent records */}
            <div>
              <div className="font-mono text-xs tracking-widest uppercase text-[#7A7A7A] mb-3">Recent Requests</div>
              <div className="space-y-0.5 max-h-80 overflow-y-auto">
                {(records || []).slice(0, 30).map((r, i) => {
                  const color = r.latency_ms > 10000 ? "#FF5454" : r.latency_ms > 3000 ? "#FFB020" : "#7A7A7A";
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded-sm font-mono text-xs" style={{ backgroundColor: i % 2 === 0 ? "#0C0C0C" : "transparent" }}>
                      <span className="text-[#3A3A3A] w-16">{r.timestamp}</span>
                      <span className="text-[#7A7A7A] w-20 truncate">{r.endpoint}</span>
                      <span className="w-10 text-right" style={{ color }}>{r.latency_ms}ms</span>
                      <span className="text-[#3A3A3A] w-8 text-right">{r.status_code}</span>
                      {r.error && <span className="text-[#FF5454] truncate flex-1">{r.error}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {(!summary || summary.total === 0) && !loading && (
          <div className="text-center py-16">
            <div className="font-mono text-xl font-bold text-[#FF5454] tracking-widest mb-2">NO DATA</div>
            <div className="font-mono text-sm text-[#7A7A7A]">Make requests through deeplossless to populate latency data.</div>
          </div>
        )}

        <div className="text-center pt-8 border-t" style={{ borderColor: "#1C1C1C" }}>
          <Link href="/" className="font-mono text-xs text-[#7A7A7A] hover:text-[#FCEE0A] tracking-widest">[ RETURN TO TRACE VIEWER ]</Link>
        </div>
      </div>
    </div>
  );
}
