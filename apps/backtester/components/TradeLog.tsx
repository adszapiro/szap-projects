import { Trade } from "@/lib/types";

interface TradeLogProps {
  trades: Trade[];
}

export default function TradeLog({ trades }: TradeLogProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate profit/loss for each trade pair
  const tradesWithPnL = trades.map((trade, index) => {
    let pnl: number | null = null;
    let pnlPercent: number | null = null;

    if (trade.type === "sell" && index > 0) {
      const buyTrade = trades[index - 1];
      if (buyTrade.type === "buy") {
        pnl = trade.value - buyTrade.value;
        pnlPercent = (pnl / buyTrade.value) * 100;
      }
    }

    return { ...trade, pnl, pnlPercent };
  });

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Trade Log
      </h3>

      {trades.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No trades executed
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">Shares</th>
                <th className="pb-3 font-medium text-right">Value</th>
                <th className="pb-3 font-medium text-right">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {tradesWithPnL.map((trade, index) => (
                <tr
                  key={index}
                  className="text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="py-3 text-slate-600 dark:text-slate-300">
                    {formatDate(trade.date)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                        trade.type === "buy"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {trade.type === "buy" ? "↗" : "↘"}{" "}
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(trade.price)}
                  </td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-300">
                    {trade.shares}
                  </td>
                  <td className="py-3 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(trade.value)}
                  </td>
                  <td className="py-3 text-right">
                    {trade.pnl !== null ? (
                      <span
                        className={`font-medium ${
                          trade.pnl >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {trade.pnl >= 0 ? "+" : ""}
                        {formatCurrency(trade.pnl)}
                        <span className="text-xs ml-1">
                          ({trade.pnlPercent! >= 0 ? "+" : ""}
                          {trade.pnlPercent!.toFixed(1)}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
