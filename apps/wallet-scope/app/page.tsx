"use client";

import { useState, useCallback, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  price: number;
  change24h: number;
}

interface WalletAnalysis {
  address: string;
  chain: string;
  ethBalance: number;
  ethUsdValue: number;
  totalValue: number;
  tokens: TokenBalance[];
  riskScore: number;
  riskFactors: {
    factor: string;
    impact: "low" | "medium" | "high";
    description: string;
  }[];
  diversificationScore: number;
  activityLevel: "low" | "medium" | "high";
}

const DEMO_WALLET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

export default function Home() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WalletAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!result) return [];
    const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];
    return [
      { name: "ETH", value: result.ethUsdValue, color: "#627EEA" },
      ...result.tokens.map((token, i) => ({
        name: token.symbol,
        value: token.usdValue,
        color: COLORS[i % COLORS.length],
      })),
    ];
  }, [result]);

  const handleAnalyze = useCallback(async (addr?: string) => {
    const targetAddress = addr || address;
    if (!targetAddress.trim()) {
      setError("Please enter a wallet address");
      return;
    }

    if (!targetAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Invalid Ethereum address format");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: targetAddress.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze wallet");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const formatUsd = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black">WalletScope</h1>
            <p className="text-sm text-gray-500">Ethereum wallet analyzer</p>
          </div>
          <a
            href="https://alexszapiro.com"
            className="text-sm text-gray-400 hover:text-black transition-colors"
          >
            ← Portfolio
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
            Wallet Address
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="0x..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:border-black focus:outline-none font-mono"
            />
            <button
              onClick={() => handleAnalyze()}
              disabled={isLoading}
              className="px-6 py-3 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
            >
              {isLoading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="text-gray-400">Try:</span>
            <button
              onClick={() => {
                setAddress(DEMO_WALLET);
                handleAnalyze(DEMO_WALLET);
              }}
              className="text-gray-600 hover:text-black font-mono"
            >
              {DEMO_WALLET.slice(0, 6)}...{DEMO_WALLET.slice(-4)}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Fetching wallet data...</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Address */}
            <div className="text-center">
              <code className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
                {result.address}
              </code>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 border border-gray-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Total Value</p>
                <p className="text-2xl font-semibold text-black">{formatUsd(result.totalValue)}</p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Risk Score</p>
                <p className={`text-2xl font-semibold ${getRiskColor(result.riskScore)}`}>
                  {result.riskScore}/100
                </p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Diversification</p>
                <p className="text-2xl font-semibold text-black">{result.diversificationScore}%</p>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Activity</p>
                <p className="text-2xl font-semibold text-black capitalize">{result.activityLevel}</p>
              </div>
            </div>

            {/* Chart & Risk */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Chart */}
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">
                  Portfolio Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatUsd(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-4">
                  {chartData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">
                  Risk Analysis
                </h3>
                <div className="space-y-3">
                  {result.riskFactors.map((factor, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${
                        factor.impact === "high"
                          ? "bg-red-50"
                          : factor.impact === "medium"
                          ? "bg-amber-50"
                          : "bg-green-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{factor.factor}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            factor.impact === "high"
                              ? "bg-red-100 text-red-700"
                              : factor.impact === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {factor.impact}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">24h</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center">E</span>
                        <span className="font-medium text-gray-800">Ethereum</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 font-mono">{result.ethBalance.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatUsd(result.ethUsdValue / (result.ethBalance || 1))}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{formatUsd(result.ethUsdValue)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">-</td>
                  </tr>
                  {result.tokens.map((token) => (
                    <tr key={token.symbol}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-medium flex items-center justify-center">
                            {token.symbol.slice(0, 1)}
                          </span>
                          <span className="font-medium text-gray-800">{token.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 font-mono">{token.balance.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatUsd(token.price)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{formatUsd(token.usdValue)}</td>
                      <td className={`px-4 py-3 text-right ${token.change24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Etherscan Link */}
            <div className="text-center">
              <a
                href={`https://etherscan.io/address/${result.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-black transition-colors"
              >
                View on Etherscan →
              </a>
            </div>
          </div>
        )}

        {/* Features */}
        {!result && !isLoading && (
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {[
              { title: "Holdings Analysis", desc: "View all tokens and ETH with USD values" },
              { title: "Risk Scoring", desc: "Concentration and diversification analysis" },
              { title: "Activity Tracking", desc: "Transaction patterns and history" },
            ].map((f, i) => (
              <div key={i} className="p-6 border border-gray-200 rounded-lg text-center">
                <h3 className="font-medium text-black mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-gray-400">
          Built by Alex Szapiro
        </div>
      </footer>
    </div>
  );
}
