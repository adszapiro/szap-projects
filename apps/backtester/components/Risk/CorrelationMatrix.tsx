"use client";

import { CorrelationResult } from "@/lib/risk";

interface CorrelationMatrixProps {
  correlations: CorrelationResult[];
  symbols: string[];
}

export default function CorrelationMatrix({ correlations, symbols }: CorrelationMatrixProps) {
  // Build matrix from correlation results
  const getCorrelation = (s1: string, s2: string): number => {
    const result = correlations.find(
      (c) =>
        (c.symbol1 === s1 && c.symbol2 === s2) ||
        (c.symbol1 === s2 && c.symbol2 === s1)
    );
    return result?.correlation ?? 0;
  };

  const getColor = (corr: number): string => {
    if (corr >= 0.8) return "bg-green-500";
    if (corr >= 0.5) return "bg-green-700";
    if (corr >= 0.2) return "bg-green-900";
    if (corr >= -0.2) return "bg-gray-700";
    if (corr >= -0.5) return "bg-red-900";
    if (corr >= -0.8) return "bg-red-700";
    return "bg-red-500";
  };

  const getTextColor = (corr: number): string => {
    if (Math.abs(corr) >= 0.5) return "text-white";
    return "text-gray-400";
  };

  return (
    <div className="panel p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Correlation Matrix</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-2 text-xs text-[var(--text-muted)]"></th>
              {symbols.map((symbol) => (
                <th key={symbol} className="p-2 text-xs text-[var(--text-muted)] font-medium">
                  {symbol.toUpperCase().slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((row) => (
              <tr key={row}>
                <td className="p-2 text-xs text-[var(--text-muted)] font-medium">
                  {row.toUpperCase().slice(0, 4)}
                </td>
                {symbols.map((col) => {
                  const corr = getCorrelation(row, col);
                  return (
                    <td key={col} className="p-1">
                      <div
                        className={`w-12 h-10 rounded flex items-center justify-center text-xs font-medium ${getColor(corr)} ${getTextColor(corr)}`}
                        title={`${row} vs ${col}: ${corr.toFixed(3)}`}
                      >
                        {corr.toFixed(2)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-[10px] text-[var(--text-muted)]">-1.0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-700" />
          <span className="text-[10px] text-[var(--text-muted)]">0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-[10px] text-[var(--text-muted)]">+1.0</span>
        </div>
      </div>
    </div>
  );
}
