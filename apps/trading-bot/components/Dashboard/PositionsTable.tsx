"use client";

import { TrendingUp, TrendingDown, X } from "lucide-react";

interface Position {
  symbol: string;
  qty: number;
  side: "long" | "short";
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlPercent: number;
  changeToday: number;
}

interface PositionsTableProps {
  positions: Position[];
  loading: boolean;
  onClose: (symbol: string) => void;
}

export default function PositionsTable({ positions, loading, onClose }: PositionsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
        <div className="p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold">Positions</h3>
        </div>
        <div className="p-8 animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-[var(--bg-tertiary)] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <h3 className="font-semibold">Positions ({positions.length})</h3>
      </div>

      {positions.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-secondary)]">
          <p>No open positions</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                <th className="text-left p-3 font-medium">Symbol</th>
                <th className="text-right p-3 font-medium">Qty</th>
                <th className="text-right p-3 font-medium">Avg Entry</th>
                <th className="text-right p-3 font-medium">Current</th>
                <th className="text-right p-3 font-medium">Market Value</th>
                <th className="text-right p-3 font-medium">P&L</th>
                <th className="text-right p-3 font-medium">Today</th>
                <th className="text-center p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const isProfitable = position.unrealizedPl >= 0;
                const isTodayProfitable = position.changeToday >= 0;

                return (
                  <tr
                    key={position.symbol}
                    className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{position.symbol}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            position.side === "long"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {position.side.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono">{position.qty}</td>
                    <td className="p-3 text-right font-mono">
                      {formatCurrency(position.avgEntryPrice)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatCurrency(position.currentPrice)}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatCurrency(position.marketValue)}
                    </td>
                    <td className="p-3 text-right">
                      <div
                        className={`flex items-center justify-end gap-1 ${
                          isProfitable ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {isProfitable ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="font-mono">
                          {formatCurrency(position.unrealizedPl)}
                        </span>
                        <span className="text-xs">
                          ({position.unrealizedPlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`font-mono ${
                          isTodayProfitable ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {isTodayProfitable ? "+" : ""}
                        {position.changeToday.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onClose(position.symbol)}
                        className="p-1 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Close position"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
