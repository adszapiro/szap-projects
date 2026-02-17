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
    <div className="bg-[var(--bg)] border border-[var(--border)]/40 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[var(--card-bg)]">
        <h2 className="text-sm font-semibold text-[var(--text)] font-mono">System Logs</h2>
        <div className="flex items-center gap-2">
          {(["all", "info", "decision", "warning", "error"] as const).map(level => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-2.5 py-1 text-[10px] font-mono font-medium rounded transition-colors duration-200 ${
                levelFilter === level
                  ? level === "error" ? "bg-[var(--negative)]/20 text-[var(--negative)] border border-[var(--negative)]/30"
                  : level === "warning" ? "bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/30"
                  : level === "decision" ? "bg-[var(--accent-warm)]/20 text-[var(--accent-warm)] border border-[var(--accent-warm)]/30"
                  : level === "info" ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
          <span className="text-xs text-[var(--text-muted)] font-mono ml-2">{filtered.length} entries</span>
        </div>
      </div>
      <div className="font-mono text-xs max-h-[600px] overflow-auto">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[var(--text-muted)]">No logs matching filter</div>
        ) : (
          filtered.map(log => (
            <div key={log.id} className="px-6 py-2.5 hover:bg-[var(--card-bg)] transition-colors duration-200 border-b border-[var(--border)]/20 flex gap-4">
              <span className="text-[var(--text-muted)] flex-shrink-0 w-20">{fmtTime(log.created_at)}</span>
              <span className={`flex-shrink-0 w-16 ${
                log.level === "error" ? "text-[var(--negative)]" :
                log.level === "warning" ? "text-[var(--warning)]" :
                log.level === "decision" ? "text-[var(--accent-warm)]" : "text-[var(--accent)]"
              }`}>[{log.level.toUpperCase()}]</span>
              <span className="text-[var(--text-secondary)] flex-1">{log.action}</span>
              {log.details && Object.keys(log.details).length > 0 && (
                <span className="text-[var(--text-muted)] truncate max-w-[300px]">{JSON.stringify(log.details)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
