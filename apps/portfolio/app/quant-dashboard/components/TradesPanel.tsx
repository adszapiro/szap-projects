"use client";

import { useState, useMemo, useCallback } from "react";
import type { AgentTrade } from "@/lib/supabase";

const TRADES_PER_PAGE = 20;

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
const fmtTime = (ds: string) => new Date(ds).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const fmtDate = (ds: string) => new Date(ds).toLocaleDateString("en-US", { month: "short", day: "numeric" });

interface TradesPanelProps {
  trades: AgentTrade[];
}

export default function TradesPanel({ trades }: TradesPanelProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(trades.length / TRADES_PER_PAGE);
  const paginated = useMemo(() => trades.slice((page - 1) * TRADES_PER_PAGE, page * TRADES_PER_PAGE), [trades, page]);

  const exportCSV = useCallback(() => {
    if (trades.length === 0) return;
    const headers = ["Date", "Time", "Symbol", "Side", "Asset Class", "Quantity", "Price", "Value", "P&L", "P&L %", "Status", "Reasoning"];
    const rows = trades.map(t => {
      const d = new Date(t.created_at);
      return [d.toLocaleDateString(), d.toLocaleTimeString(), t.symbol, t.side.toUpperCase(), t.asset_class, t.qty, t.price?.toFixed(2) || "", (t.qty * (t.price || 0)).toFixed(2), t.pnl?.toFixed(2) || "", t.pnl_percent?.toFixed(2) || "", t.status, (t.reasoning || "").replace(/,/g, ";")];
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `quant-trades-${new Date().toISOString().split("T")[0]}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [trades]);

  return (
    <div className="bg-[#12121a] border border-gray-800/50 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Trade History</h2>
        <div className="flex items-center gap-4">
          <button onClick={exportCSV} disabled={trades.length === 0} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-xs font-medium transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          <span className="text-xs text-gray-500 font-mono">{trades.length} trades</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-xs font-mono">&larr;</button>
              <span className="text-xs text-gray-400 font-mono">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-xs font-mono">&rarr;</button>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900/50 text-xs text-gray-400 uppercase font-mono">
              <th className="px-4 sm:px-6 py-3 text-left">Time</th>
              <th className="px-4 sm:px-6 py-3 text-left">Symbol</th>
              <th className="px-4 sm:px-6 py-3 text-center">Side</th>
              <th className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">Asset</th>
              <th className="px-4 sm:px-6 py-3 text-right hidden md:table-cell">Qty</th>
              <th className="px-4 sm:px-6 py-3 text-right hidden md:table-cell">Price</th>
              <th className="px-4 sm:px-6 py-3 text-right hidden lg:table-cell">Value</th>
              <th className="px-4 sm:px-6 py-3 text-right">P&L</th>
              <th className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/30">
            {trades.length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500 text-sm">No trades executed yet</td></tr>
            ) : (
              paginated.map(t => (
                <tr key={t.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 sm:px-6 py-3">
                    <p className="text-sm text-white font-mono">{fmtTime(t.created_at)}</p>
                    <p className="text-[10px] text-gray-500">{fmtDate(t.created_at)}</p>
                  </td>
                  <td className="px-4 sm:px-6 py-3 font-mono font-semibold text-white">{t.symbol}</td>
                  <td className="px-4 sm:px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium ${t.side === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {t.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono ${t.asset_class === "crypto" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                      {t.asset_class.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right font-mono text-sm text-gray-300 hidden md:table-cell">{t.qty}</td>
                  <td className="px-4 sm:px-6 py-3 text-right font-mono text-sm text-gray-300 hidden md:table-cell">${t.price?.toFixed(2) || "--"}</td>
                  <td className="px-4 sm:px-6 py-3 text-right font-mono text-sm text-gray-300 hidden lg:table-cell">{t.price ? fmt(t.qty * t.price) : "--"}</td>
                  <td className="px-4 sm:px-6 py-3 text-right">
                    {t.pnl !== null ? (
                      <span className={`font-mono text-sm font-medium ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {t.pnl >= 0 ? "+" : ""}{fmt(t.pnl)}
                      </span>
                    ) : <span className="text-gray-500">--</span>}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono ${
                      t.status === "filled" ? "bg-green-500/20 text-green-400" :
                      t.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-800 text-gray-400"
                    }`}>{t.status.toUpperCase()}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
