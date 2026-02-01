"use client";

import { TrendingUp, Settings, Calendar, DollarSign, Search, BarChart3, LayoutGrid, Shield, Zap, PieChart } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  initialCapital: number;
  onCapitalChange: (capital: number) => void;
}

export default function Header({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  initialCapital,
  onCapitalChange,
}: HeaderProps) {
  return (
    <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-4">
      {/* Logo & Nav */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">AlgoBacktest</h1>
            <p className="text-[10px] text-[var(--text-muted)]">Professional Trading Simulator</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--bg-tertiary)] rounded hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Backtest
          </Link>
          <Link
            href="/screener"
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            Screener
          </Link>
          <Link
            href="/heatmap"
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded transition-colors flex items-center gap-1.5"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Heatmap
          </Link>
          <Link
            href="/risk"
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded transition-colors flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            Risk
          </Link>
          <Link
            href="/scenarios"
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Scenarios
          </Link>
          <Link
            href="/optimizer"
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded transition-colors flex items-center gap-1.5"
          >
            <PieChart className="w-3.5 h-3.5" />
            Optimizer
          </Link>
        </nav>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-white text-xs px-2 py-1.5 rounded"
          />
          <span className="text-[var(--text-muted)] text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-white text-xs px-2 py-1.5 rounded"
          />
        </div>

        {/* Capital */}
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="number"
            value={initialCapital}
            onChange={(e) => onCapitalChange(Number(e.target.value))}
            className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-white text-xs px-2 py-1.5 rounded w-24"
          />
        </div>

        {/* Settings */}
        <button className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
          <Settings className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
      </div>
    </header>
  );
}
