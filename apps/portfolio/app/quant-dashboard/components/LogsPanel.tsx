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
    <div className="bg-[#0a0a0f] border border-gray-800/50 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#12121a]">
        <h2 className="text-sm font-semibold text-white font-mono">System Logs</h2>
        <div className="flex items-center gap-2">
          {(["all", "info", "decision", "warning", "error"] as const).map(level => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded transition-colors ${
                levelFilter === level
                  ? level === "error" ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : level === "warning" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : level === "decision" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : level === "info" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-gray-700/50 text-gray-300 border border-gray-600/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
          <span className="text-xs text-gray-500 font-mono ml-2">{filtered.length} entries</span>
        </div>
      </div>
      <div className="font-mono text-xs max-h-[600px] overflow-auto">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">No logs matching filter</div>
        ) : (
          filtered.map(log => (
            <div key={log.id} className="px-6 py-2 hover:bg-gray-900/50 transition-colors border-b border-gray-900/50 flex gap-4">
              <span className="text-gray-600 flex-shrink-0 w-20">{fmtTime(log.created_at)}</span>
              <span className={`flex-shrink-0 w-16 ${
                log.level === "error" ? "text-red-400" :
                log.level === "warning" ? "text-yellow-400" :
                log.level === "decision" ? "text-purple-400" : "text-blue-400"
              }`}>[{log.level.toUpperCase()}]</span>
              <span className="text-gray-300 flex-1">{log.action}</span>
              {log.details && Object.keys(log.details).length > 0 && (
                <span className="text-gray-600 truncate max-w-[300px]">{JSON.stringify(log.details)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
