"use client";

import { useState } from "react";
import { ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";

interface TradeFormProps {
  onSubmit: (order: {
    symbol: string;
    side: "buy" | "sell";
    type: "market" | "limit";
    qty: number;
    limitPrice?: number;
  }) => Promise<void>;
  disabled: boolean;
}

export default function TradeForm({ onSubmit, disabled }: TradeFormProps) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"market" | "limit">("market");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!symbol.trim()) {
      setError("Symbol is required");
      return;
    }

    const qtyNum = parseInt(qty);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setError("Quantity must be at least 1");
      return;
    }

    if (type === "limit" && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError("Limit price is required for limit orders");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        symbol: symbol.toUpperCase(),
        side,
        type,
        qty: qtyNum,
        limitPrice: type === "limit" ? parseFloat(limitPrice) : undefined,
      });
      // Reset form on success
      setSymbol("");
      setQty("");
      setLimitPrice("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-4">
      <h3 className="font-semibold mb-4">Quick Trade</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Symbol */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Symbol
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-blue)]"
            disabled={disabled || loading}
          />
        </div>

        {/* Side */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Side
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`flex items-center justify-center gap-2 py-2 rounded font-medium text-sm transition-colors ${
                side === "buy"
                  ? "bg-green-500 text-white"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-green-500/20"
              }`}
              disabled={disabled || loading}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`flex items-center justify-center gap-2 py-2 rounded font-medium text-sm transition-colors ${
                side === "sell"
                  ? "bg-red-500 text-white"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-red-500/20"
              }`}
              disabled={disabled || loading}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Sell
            </button>
          </div>
        </div>

        {/* Order Type */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Order Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("market")}
              className={`py-2 rounded text-sm font-medium transition-colors ${
                type === "market"
                  ? "bg-[var(--accent-blue)] text-white"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
              disabled={disabled || loading}
            >
              Market
            </button>
            <button
              type="button"
              onClick={() => setType("limit")}
              className={`py-2 rounded text-sm font-medium transition-colors ${
                type === "limit"
                  ? "bg-[var(--accent-blue)] text-white"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
              disabled={disabled || loading}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Quantity (shares)
          </label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="10"
            min="1"
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-blue)]"
            disabled={disabled || loading}
          />
        </div>

        {/* Limit Price (conditional) */}
        {type === "limit" && (
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Limit Price ($)
            </label>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="150.00"
              min="0.01"
              step="0.01"
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-blue)]"
              disabled={disabled || loading}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-500 text-sm bg-red-500/10 px-3 py-2 rounded">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={disabled || loading}
          className={`w-full py-3 rounded font-medium transition-colors flex items-center justify-center gap-2 ${
            side === "buy"
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              {side === "buy" ? "Buy" : "Sell"} {symbol || "..."}{" "}
              {qty ? `x${qty}` : ""}
            </>
          )}
        </button>
      </form>

      {disabled && (
        <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
          Connect Alpaca account to trade
        </p>
      )}
    </div>
  );
}
