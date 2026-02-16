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
    <div className="bg-[#1a1512] border border-[#2a2420]/40 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#2a2420]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#f5e6d3]">Trade History</h2>
        <div className="flex items-center gap-4">
          <button onClick={exportCSV} disabled={trades.length === 0} className="px-3 py-1.5 bg-[#d4a574] hover:bg-[#e6b889] text-[#0f0d0b] disabled:opacity-50 rounded text-xs font-medium transition-colors duration-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          <span className="text-xs text-[#9b8772] font-mono">{trades.length} trades</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 bg-[#211d19] hover:bg-[#2a2420] disabled:opacity-50 rounded text-xs font-mono text-[#c9b79c]">&larr;</button>
              <span className="text-xs text-[#9b8772] font-mono">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 bg-[#211d19] hover:bg-[#2a2420] disabled:opacity-50 rounded text-xs font-mono text-[#c9b79c]">&rarr;</button>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#141210] text-xs text-[#9b8772] uppercase font-mono">
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
          <tbody className="divide-y divide-[#2a2420]/30">
            {trades.length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-[#9b8772] text-sm">No trades executed yet</td></tr>
            ) : (
              paginated.map(t => (
                <tr key={t.id} className="hover:bg-[#211d19] transition-colors duration-200">
                  <td className="px-4 sm:px-6 py-3">
                    <p className="text-sm text-[#f5e6d3] font-mono">{fmtTime(t.created_at)}</p>
                    <p className="text-[10px] text-[#9b8772]">{fmtDate(t.created_at)}</p>
                  </td>
                  <td className="px-4 sm:px-6 py-3 font-mono font-semibold text-[#f5e6d3]">{t.symbol}</td>
                  <td className="px-4 sm:px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium ${t.side === "buy" ? "bg-[#9cb870]/20 text-[#9cb870]" : "bg-[#c67b6a]/20 text-[#c67b6a]"}`}>
                      {t.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono ${t.asset_class === "crypto" ? "bg-[#c9825b]/10 text-[#c9825b]" : "bg-[#d4a574]/10 text-[#d4a574]"}`}>
                      {t.asset_class.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right font-mono text-sm text-[#c9b79c] hidden md:table-cell">{t.qty}</td>
                  <td className="px-4 sm:px-6 py-3 text-right font-mono text-sm text-[#c9b79c] hidden md:table-cell">${t.price?.toFixed(2) || "--"}</td>
                  <td className="px-4 sm:px-6 py-3 text-right font-mono text-sm text-[#c9b79c] hidden lg:table-cell">{t.price ? fmt(t.qty * t.price) : "--"}</td>
                  <td className="px-4 sm:px-6 py-3 text-right">
                    {t.pnl !== null ? (
                      <span className={`font-mono text-sm font-medium ${t.pnl >= 0 ? "text-[#9cb870]" : "text-[#c67b6a]"}`}>
                        {t.pnl >= 0 ? "+" : ""}{fmt(t.pnl)}
                      </span>
                    ) : <span className="text-[#9b8772]">--</span>}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-center hidden sm:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono ${
                      t.status === "filled" ? "bg-[#9cb870]/20 text-[#9cb870]" :
                      t.status === "pending" ? "bg-[#d9a45e]/20 text-[#d9a45e]" : "bg-[#211d19] text-[#9b8772]"
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
