"use client";

import { AttributionResult } from "@/lib/attribution";
import { TrendingUp, TrendingDown, Calendar, Target, Award, Clock } from "lucide-react";

interface AttributionPanelProps {
  attribution: AttributionResult;
}

export default function AttributionPanel({ attribution }: AttributionPanelProps) {
  const { timingAttribution, tradeAttribution, summary } = attribution;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="metric-card">
          <div className="metric-label flex items-center gap-1">
            <Award className="w-3 h-3" />
            Best Trade
          </div>
          <div className="metric-value text-green-400 text-sm">
            +{summary.bestTrade.return.toFixed(2)}%
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            {summary.bestTrade.date}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Worst Trade
          </div>
          <div className="metric-value text-red-400 text-sm">
            {summary.worstTrade.return.toFixed(2)}%
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            {summary.worstTrade.date}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label flex items-center gap-1">
            <Target className="w-3 h-3" />
            Profit Factor
          </div>
          <div className={`metric-value text-sm ${summary.profitFactor > 1 ? "text-green-400" : "text-red-400"}`}>
            {summary.profitFactor === Infinity ? "∞" : summary.profitFactor.toFixed(2)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Avg Hold
          </div>
          <div className="metric-value text-white text-sm">
            {Math.round(summary.avgHoldingPeriod)} days
          </div>
        </div>
      </div>

      {/* Average Win/Loss */}
      <div className="panel p-3">
        <h3 className="text-xs font-semibold text-white mb-3">Win/Loss Analysis</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-muted)]">Avg Winning Trade</span>
              <span className="text-xs font-medium text-green-400">
                +{summary.avgWinningTrade.toFixed(2)}%
              </span>
            </div>
            <div className="h-2 bg-[var(--bg-tertiary)] rounded overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${Math.min(100, summary.avgWinningTrade * 5)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-muted)]">Avg Losing Trade</span>
              <span className="text-xs font-medium text-red-400">
                -{summary.avgLosingTrade.toFixed(2)}%
              </span>
            </div>
            <div className="h-2 bg-[var(--bg-tertiary)] rounded overflow-hidden">
              <div
                className="h-full bg-red-500"
                style={{ width: `${Math.min(100, summary.avgLosingTrade * 5)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Attribution */}
      {timingAttribution.length > 0 && (
        <div className="panel p-3">
          <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Monthly Attribution
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {timingAttribution.map((month) => (
              <div key={month.period} className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">{month.period}</span>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium ${month.return >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {month.return >= 0 ? "+" : ""}{month.return.toFixed(2)}%
                  </span>
                  <div className="w-20">
                    <div className="h-1.5 bg-[var(--bg-tertiary)] rounded overflow-hidden">
                      <div
                        className={`h-full ${month.contribution >= 0 ? "bg-green-500" : "bg-red-500"}`}
                        style={{
                          width: `${Math.min(100, Math.abs(month.contribution) * 10)}%`,
                          marginLeft: month.contribution < 0 ? "auto" : 0,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade-by-Trade */}
      {tradeAttribution.length > 0 && (
        <div className="panel p-3">
          <h3 className="text-xs font-semibold text-white mb-3">Trade-by-Trade Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)]">
                  <th className="text-left py-2">Entry</th>
                  <th className="text-left py-2">Exit</th>
                  <th className="text-right py-2">Days</th>
                  <th className="text-right py-2">Return</th>
                  <th className="text-right py-2">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {tradeAttribution.slice(0, 10).map((trade, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)]">
                    <td className="py-2 text-[var(--text-secondary)]">{trade.entryDate}</td>
                    <td className="py-2 text-[var(--text-secondary)]">{trade.exitDate}</td>
                    <td className="py-2 text-right text-[var(--text-muted)]">{trade.holdingDays}</td>
                    <td className={`py-2 text-right font-medium ${trade.return >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {trade.return >= 0 ? "+" : ""}{trade.return.toFixed(2)}%
                    </td>
                    <td className={`py-2 text-right ${trade.contribution >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {trade.contribution >= 0 ? "+" : ""}{trade.contribution.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tradeAttribution.length > 10 && (
            <div className="text-center mt-2 text-[10px] text-[var(--text-muted)]">
              Showing 10 of {tradeAttribution.length} trades
            </div>
          )}
        </div>
      )}
    </div>
  );
}
