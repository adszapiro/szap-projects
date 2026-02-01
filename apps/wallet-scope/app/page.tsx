"use client";

import { useState } from "react";
import { 
  Wallet, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Shield,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  ExternalLink
} from "lucide-react";

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

export default function Home() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WalletAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!address.trim()) {
      setError("Please enter a wallet address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
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
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-green-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return "Low Risk";
    if (score >= 40) return "Medium Risk";
    return "High Risk";
  };

  const formatUsd = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 4) => {
    return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">WalletScope</h1>
              <p className="text-xs text-gray-500">On-Chain Wallet Analyzer</p>
            </div>
          </div>
          <a
            href="https://portfolio-adszapiro.vercel.app"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to Portfolio
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Analyze Any <span className="gradient-text">Crypto Wallet</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Enter an Ethereum wallet address to see holdings, risk score, and detailed analytics.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="Enter Ethereum wallet address (0x...)"
                className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all glow-orange"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Analyze"
              )}
            </button>
          </div>
          
          {/* Example addresses */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <span className="text-sm text-gray-500">Try:</span>
            {[
              "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // Vitalik
              "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503", // Binance
            ].map((addr) => (
              <button
                key={addr}
                onClick={() => setAddress(addr)}
                className="text-sm text-orange-400 hover:text-orange-300 font-mono"
              >
                {addr.slice(0, 6)}...{addr.slice(-4)}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-900/20 border border-red-800 rounded-xl flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Value */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Total Value</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatUsd(result.totalValue)}
                </p>
              </div>

              {/* Risk Score */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Risk Score</span>
                </div>
                <p className={`text-2xl font-bold ${getRiskColor(result.riskScore)}`}>
                  {result.riskScore}/100
                </p>
                <p className={`text-sm ${getRiskColor(result.riskScore)}`}>
                  {getRiskLabel(result.riskScore)}
                </p>
              </div>

              {/* Diversification */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <PieChart className="w-4 h-4" />
                  <span className="text-sm">Diversification</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {result.diversificationScore}%
                </p>
                <p className="text-sm text-gray-500">
                  {result.tokens.length + 1} assets
                </p>
              </div>

              {/* Activity */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">Activity Level</span>
                </div>
                <p className="text-2xl font-bold text-white capitalize">
                  {result.activityLevel}
                </p>
              </div>
            </div>

            {/* Holdings */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-400" />
                Holdings
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-500 text-sm border-b border-gray-800">
                      <th className="pb-3">Asset</th>
                      <th className="pb-3 text-right">Balance</th>
                      <th className="pb-3 text-right">Price</th>
                      <th className="pb-3 text-right">Value</th>
                      <th className="pb-3 text-right">24h</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {/* ETH */}
                    <tr className="border-b border-gray-800/50">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                            ETH
                          </div>
                          <div>
                            <p className="text-white font-medium">Ethereum</p>
                            <p className="text-gray-500">ETH</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-right text-white">
                        {formatNumber(result.ethBalance)}
                      </td>
                      <td className="py-4 text-right text-gray-400">
                        {formatUsd(result.ethUsdValue / (result.ethBalance || 1))}
                      </td>
                      <td className="py-4 text-right text-white font-medium">
                        {formatUsd(result.ethUsdValue)}
                      </td>
                      <td className="py-4 text-right text-green-400">-</td>
                    </tr>
                    
                    {/* Tokens */}
                    {result.tokens.map((token) => (
                      <tr key={token.symbol} className="border-b border-gray-800/50">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs">
                              {token.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-white font-medium">{token.name}</p>
                              <p className="text-gray-500">{token.symbol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-right text-white">
                          {formatNumber(token.balance)}
                        </td>
                        <td className="py-4 text-right text-gray-400">
                          {formatUsd(token.price)}
                        </td>
                        <td className="py-4 text-right text-white font-medium">
                          {formatUsd(token.usdValue)}
                        </td>
                        <td className={`py-4 text-right flex items-center justify-end gap-1 ${
                          token.change24h >= 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {token.change24h >= 0 ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {Math.abs(token.change24h).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk Factors */}
            {result.riskFactors.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Risk Analysis
                </h3>
                
                <div className="space-y-4">
                  {result.riskFactors.map((factor, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border ${
                        factor.impact === "high"
                          ? "bg-red-900/20 border-red-800"
                          : factor.impact === "medium"
                          ? "bg-yellow-900/20 border-yellow-800"
                          : "bg-green-900/20 border-green-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded font-medium uppercase ${
                          factor.impact === "high"
                            ? "bg-red-800 text-red-200"
                            : factor.impact === "medium"
                            ? "bg-yellow-800 text-yellow-200"
                            : "bg-green-800 text-green-200"
                        }`}>
                          {factor.impact}
                        </span>
                        <span className="font-medium text-white">{factor.factor}</span>
                      </div>
                      <p className="text-sm text-gray-400">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View on Etherscan */}
            <div className="text-center">
              <a
                href={`https://etherscan.io/address/${result.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300"
              >
                View on Etherscan
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Features */}
        {!result && !isLoading && (
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-orange-900/50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Holdings Analysis</h3>
              <p className="text-gray-400 text-sm">See all tokens and ETH balance with USD values</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-900/50 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Risk Scoring</h3>
              <p className="text-gray-400 text-sm">Concentration, volatility, and diversification analysis</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-yellow-900/50 flex items-center justify-center">
                <Activity className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Activity Tracking</h3>
              <p className="text-gray-400 text-sm">Transaction history and activity patterns</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
          Built by Alex Szapiro | Part of the{" "}
          <a href="https://portfolio-adszapiro.vercel.app" className="text-orange-400 hover:text-orange-300">
            Portfolio
          </a>
        </div>
      </footer>
    </div>
  );
}
