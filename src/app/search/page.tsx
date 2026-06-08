"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { fetchSearchEvents, type SearchEvent, type SearchFilter } from "@/lib/api";

const EVENT_TYPES = [
  "", "request_start", "request_end", "user_message",
  "assistant_message", "reasoning", "tool_call", "tool_result", "error",
];

const TOOLS = ["", "Read", "Edit", "Write", "Grep", "Glob", "Bash", "shell"];

export default function SearchPage() {
  const [filter, setFilter] = useState<SearchFilter>({ limit: 50 });
  const [results, setResults] = useState<SearchEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof SearchFilter, value: string | number) => {
    setFilter(prev => {
      const next = { ...prev };
      if (value === "" || value === 0) {
        delete next[key];
      } else if (key === "limit") {
        next.limit = Number(value);
      } else {
        (next as Record<string, string>)[key] = String(value);
      }
      return next;
    });
  };

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSearchEvents(filter);
      setResults(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <div className="border-b px-4 py-1.5 flex items-center gap-2 font-mono text-xs tracking-wider uppercase"
        style={{ borderColor: "#1C1C1C", backgroundColor: "#080808" }}>
        <Link href="/" className="text-[#FCEE0A] hover:underline mr-4">← HOME</Link>
        <span className="text-[#7A7A7A]">EVENT SEARCH</span>
        <span className="flex-1" />
      </div>

      {/* Filter bar */}
      <div className="border-b px-4 py-3 flex flex-wrap gap-2 font-mono text-xs"
        style={{ borderColor: "#1C1C1C", backgroundColor: "#0C0C0C" }}>
        <select
          value={filter.event_type ?? ""}
          onChange={e => update("event_type", e.target.value)}
          className="bg-[#0A0A0A] border rounded-sm px-2 py-1 text-[#EAEAEA] outline-none"
          style={{ borderColor: "#1C1C1C" }}
        >
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>
              {t || "any event_type"}
            </option>
          ))}
        </select>
        <select
          value={filter.tool ?? ""}
          onChange={e => update("tool", e.target.value)}
          className="bg-[#0A0A0A] border rounded-sm px-2 py-1 text-[#EAEAEA] outline-none"
          style={{ borderColor: "#1C1C1C" }}
        >
          {TOOLS.map(t => (
            <option key={t} value={t}>{t || "any tool"}</option>
          ))}
        </select>
        <select
          value={filter.status ?? ""}
          onChange={e => update("status", e.target.value)}
          className="bg-[#0A0A0A] border rounded-sm px-2 py-1 text-[#EAEAEA] outline-none"
          style={{ borderColor: "#1C1C1C" }}
        >
          <option value="">any status</option>
          <option value="success">success</option>
          <option value="error">error</option>
        </select>
        <input
          type="text"
          placeholder="session_id"
          value={filter.session ?? ""}
          onChange={e => update("session", e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-[#0A0A0A] border rounded-sm px-2 py-1 text-[#EAEAEA] outline-none w-28"
          style={{ borderColor: "#1C1C1C" }}
        />
        <input
          type="text"
          placeholder="path LIKE %..."
          value={filter.path ?? ""}
          onChange={e => update("path", e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-[#0A0A0A] border rounded-sm px-2 py-1 text-[#EAEAEA] outline-none w-36"
          style={{ borderColor: "#1C1C1C" }}
        />
        <input
          type="text"
          placeholder="FTS: timeout, config..."
          value={filter.content ?? ""}
          onChange={e => update("content", e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-[#0A0A0A] border rounded-sm px-2 py-1 text-[#FCEE0A] outline-none w-40"
          style={{ borderColor: "#FCEE0A30" }}
        />
        <button
          onClick={search}
          disabled={loading}
          className="px-3 py-1 rounded-sm text-xs font-bold tracking-wider border"
          style={{
            backgroundColor: "#FCEE0A15",
            borderColor: "#FCEE0A40",
            color: "#FCEE0A",
            opacity: loading ? 0.5 : 1,
          }}
        >
          SEARCH
        </button>
      </div>

      {/* Results */}
      <div className="p-4 font-mono text-xs">
        {error && (
          <div className="text-[#FF5454] mb-3 p-2 rounded-sm border" style={{ borderColor: "#FF545430", backgroundColor: "#FF545408" }}>
            {error}
          </div>
        )}

        {results === null && !loading && (
          <div className="text-center py-12 text-[#7A7A7A] tracking-wider">
            Enter filters and press SEARCH to query the event index.
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-[#FCEE0A]">SEARCHING...</div>
        )}

        {results !== null && results.length === 0 && (
          <div className="text-center py-12 text-[#7A7A7A]">no results</div>
        )}

        {results !== null && results.length > 0 && (
          <>
            <div className="text-[#7A7A7A] mb-2">{results.length} event(s)</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-[#7A7A7A] border-b" style={{ borderColor: "#1C1C1C" }}>
                    <th className="py-1.5 px-2 whitespace-nowrap">TYPE</th>
                    <th className="py-1.5 px-2 whitespace-nowrap">TOOL</th>
                    <th className="py-1.5 px-2 whitespace-nowrap">SESSION</th>
                    <th className="py-1.5 px-2 whitespace-nowrap">STATUS</th>
                    <th className="py-1.5 px-2 whitespace-nowrap">PATH</th>
                    <th className="py-1.5 px-2 whitespace-nowrap">CONTENT</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((ev) => (
                    <tr key={ev.id} className="border-b hover:bg-[#FFFFFF04]" style={{ borderColor: "#1C1C1C" }}>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span style={{ color: typeColor(ev.event_type) }}>{ev.event_type}</span>
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap text-[#EAEAEA]">
                        {ev.tool_name ?? "-"}
                      </td>
                      <td className="py-1.5 px-2 text-[#7A7A7A] whitespace-nowrap">
                        {ev.session_id.slice(0, 16)}{ev.session_id.length > 16 ? "…" : ""}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span style={{ color: ev.status === "error" ? "#FF5454" : "#00D1B2" }}>
                          {ev.status ?? "-"}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-[#7A7A7A] max-w-xs truncate whitespace-nowrap">
                        {ev.path ?? "-"}
                      </td>
                      <td className="py-1.5 px-2 text-[#EAEAEA] max-w-lg truncate">
                        {ev.content.slice(0, 120)}{ev.content.length > 120 ? "…" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function typeColor(t: string): string {
  switch (t) {
    case "error": return "#FF5454";
    case "tool_call": return "#FCEE0A";
    case "tool_result": return "#00D1B2";
    case "reasoning": return "#7EB8FF";
    case "request_start": case "request_end": return "#7A7A7A";
    case "user_message": return "#FFB020";
    default: return "#EAEAEA";
  }
}
