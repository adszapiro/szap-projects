"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
  { id: "strategies", label: "Strategies", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "trades", label: "Trades", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { id: "research", label: "Research", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { id: "logs", label: "Logs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
] as const;

export type TabId = (typeof NAV_ITEMS)[number]["id"];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  agentStatus: { isRunning: boolean; lastActivity: string | null };
  lastRefresh: Date;
  refreshing: boolean;
  onRefresh: () => void;
  strategiesCount: number;
  papersCount: number;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  agentStatus,
  lastRefresh,
  refreshing,
  onRefresh,
  strategiesCount,
  papersCount,
  sidebarOpen,
  onToggleSidebar,
}: SidebarProps) {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={onToggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#1a1512] p-2 rounded-lg border border-[#2a2420]/40"
      >
        <svg className="w-5 h-5 text-[#c9b79c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onToggleSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-[220px] bg-[#141210] border-r border-[#2a2420]/40 z-40 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 px-5 py-5 border-b border-[#2a2420]/40 group">
          <div className="w-9 h-9 bg-gradient-to-br from-[#d4a574] to-[#c9825b] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#0f0d0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f5e6d3] group-hover:text-[#d4a574] transition-colors">Quant Terminal</p>
            <p className="text-[10px] text-[#9b8772] font-mono">v2.0 Paper</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { onTabChange(item.id); onToggleSidebar(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                activeTab === item.id
                  ? "bg-[#d4a574]/10 text-[#d4a574] border border-[#d4a574]/20"
                  : "text-[#c9b79c] hover:text-[#f5e6d3] hover:bg-[#211d19]"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-[#2a2420]/40 p-4 space-y-3">
          {/* Agent status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${agentStatus.isRunning ? "bg-[#9cb870] animate-pulse" : "bg-[#c67b6a]"}`} />
              <span className="text-xs text-[#c9b79c] font-mono">
                {agentStatus.isRunning ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            <span className="text-[10px] text-[#9b8772] font-mono">{strategiesCount} strats</span>
          </div>

          {/* Last refresh */}
          <div className="flex items-center justify-between text-[10px] text-[#9b8772] font-mono">
            <span>Updated</span>
            <span>{formatTime(lastRefresh)}</span>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="w-full px-3 py-2 bg-[#211d19] hover:bg-[#2a2420] disabled:opacity-50 rounded-lg text-xs font-medium text-[#c9b79c] transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "..." : "Refresh"}
          </button>

          {/* Source code */}
          <a
            href="https://github.com/adszapiro/szap-projects/tree/main/apps/quant-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-[10px] text-[#9b8772] hover:text-[#d4a574] transition-colors duration-200"
          >
            Source Code
          </a>
        </div>
      </aside>
    </>
  );
}
