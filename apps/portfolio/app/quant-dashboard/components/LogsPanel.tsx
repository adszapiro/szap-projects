"use client";

import { useState, useMemo } from "react";
import type { AgentLog } from "@/lib/supabase";

const fmtTime = (ds: string) => new Date(ds).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

type LogLevel = "all" | "info" | "warning" | "error" | "decision";

interface LogsPanelProps {
  logs: AgentLog[];
}

export default function LogsPanel({ logs }: LogsPanelProps) {
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");

  const filtered = useMemo(() =>
    levelFilter === "all" ? logs : logs.filter(l => l.level === levelFilter),
  [logs, levelFilter]);

  return (
    <div className="bg-[#0f0d0b] border border-[#2a2420]/40 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#2a2420]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#1a1512]">
        <h2 className="text-sm font-semibold text-[#f5e6d3] font-mono">System Logs</h2>
        <div className="flex items-center gap-2">
          {(["all", "info", "decision", "warning", "error"] as const).map(level => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded transition-colors duration-200 ${
                levelFilter === level
                  ? level === "error" ? "bg-[#c67b6a]/20 text-[#c67b6a] border border-[#c67b6a]/30"
                  : level === "warning" ? "bg-[#d9a45e]/20 text-[#d9a45e] border border-[#d9a45e]/30"
                  : level === "decision" ? "bg-[#c9825b]/20 text-[#c9825b] border border-[#c9825b]/30"
                  : level === "info" ? "bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/30"
                  : "bg-[#211d19] text-[#c9b79c] border border-[#3d342b]"
                  : "text-[#9b8772] hover:text-[#c9b79c] hover:bg-[#211d19]"
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
          <span className="text-xs text-[#9b8772] font-mono ml-2">{filtered.length} entries</span>
        </div>
      </div>
      <div className="font-mono text-xs max-h-[600px] overflow-auto">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#9b8772]">No logs matching filter</div>
        ) : (
          filtered.map(log => (
            <div key={log.id} className="px-6 py-2.5 hover:bg-[#1a1512] transition-colors duration-200 border-b border-[#2a2420]/20 flex gap-4">
              <span className="text-[#9b8772] flex-shrink-0 w-20">{fmtTime(log.created_at)}</span>
              <span className={`flex-shrink-0 w-16 ${
                log.level === "error" ? "text-[#c67b6a]" :
                log.level === "warning" ? "text-[#d9a45e]" :
                log.level === "decision" ? "text-[#c9825b]" : "text-[#d4a574]"
              }`}>[{log.level.toUpperCase()}]</span>
              <span className="text-[#c9b79c] flex-1">{log.action}</span>
              {log.details && Object.keys(log.details).length > 0 && (
                <span className="text-[#9b8772] truncate max-w-[300px]">{JSON.stringify(log.details)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
