"use client";

import { TrendingUp, TrendingDown, DollarSign, Wallet, Activity } from "lucide-react";

interface AccountData {
  portfolioValue: number;
  cash: number;
  equity: number;
  buyingPower: number;
  dailyPnl: number;
  dailyPnlPercent: number;
}

interface MarketData {
  isOpen: boolean;
  nextOpen: string;
  nextClose: string;
}

interface AccountCardProps {
  account: AccountData | null;
  market: MarketData | null;
  mode: "paper" | "live";
  loading: boolean;
}

export default function AccountCard({ account, market, mode, loading }: AccountCardProps) {
  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg p-6 border border-[var(--border-color)]">
        <div className="animate-pulse">
          <div className="h-6 bg-[var(--bg-tertiary)] rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-[var(--bg-tertiary)] rounded w-2/3 mb-6"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-[var(--bg-tertiary)] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg p-6 border border-[var(--border-color)]">
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Alpaca Account</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Add your Alpaca API keys to start paper trading
          </p>
          <a
            href="https://alpaca.markets/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Get API Keys
          </a>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const isProfitable = account.dailyPnl >= 0;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-6 border border-[var(--border-color)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Account Overview</h2>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              mode === "paper"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-green-500/20 text-green-400"
            }`}
          >
            {mode === "paper" ? "PAPER" : "LIVE"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              market?.isOpen ? "bg-green-500 status-live" : "bg-red-500"
            }`}
          ></span>
          <span className="text-sm text-[var(--text-secondary)]">
            Market {market?.isOpen ? "Open" : "Closed"}
          </span>
        </div>
      </div>

      {/* Portfolio Value */}
      <div className="mb-6">
        <p className="text-sm text-[var(--text-secondary)] mb-1">Portfolio Value</p>
        <div className="flex items-end gap-4">
          <span className="text-3xl font-bold">{formatCurrency(account.portfolioValue)}</span>
          <div
            className={`flex items-center gap-1 pb-1 ${
              isProfitable ? "text-green-500" : "text-red-500"
            }`}
          >
            {isProfitable ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {formatCurrency(account.dailyPnl)} ({account.dailyPnlPercent.toFixed(2)}%)
            </span>
            <span className="text-xs text-[var(--text-muted)]">today</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-[var(--accent-green)]" />
            <span className="text-xs text-[var(--text-secondary)]">Cash</span>
          </div>
          <span className="text-lg font-semibold">{formatCurrency(account.cash)}</span>
        </div>

        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[var(--accent-blue)]" />
            <span className="text-xs text-[var(--text-secondary)]">Equity</span>
          </div>
          <span className="text-lg font-semibold">{formatCurrency(account.equity)}</span>
        </div>

        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-[var(--accent-purple)]" />
            <span className="text-xs text-[var(--text-secondary)]">Buying Power</span>
          </div>
          <span className="text-lg font-semibold">{formatCurrency(account.buyingPower)}</span>
        </div>

        <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            {isProfitable ? (
              <TrendingUp className="w-4 h-4 text-[var(--accent-green)]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[var(--accent-red)]" />
            )}
            <span className="text-xs text-[var(--text-secondary)]">Today&apos;s P&L</span>
          </div>
          <span
            className={`text-lg font-semibold ${
              isProfitable ? "text-green-500" : "text-red-500"
            }`}
          >
            {formatCurrency(account.dailyPnl)}
          </span>
        </div>
      </div>
    </div>
  );
}
