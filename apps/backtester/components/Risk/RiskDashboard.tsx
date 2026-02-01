"use client";

import { RiskMetrics } from "@/lib/risk";
import { Shield, TrendingDown, Activity, AlertTriangle, Target, Clock } from "lucide-react";

interface RiskDashboardProps {
  metrics: RiskMetrics;
}

export default function RiskDashboard({ metrics }: RiskDashboardProps) {
  return (
    <div className="space-y-3">
      {/* VaR Section */}
      <div className="panel p-3">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-white">Value at Risk</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="metric-card">
            <div className="metric-label">VaR 95%</div>
            <div className="metric-value text-red-400">
              -{metrics.var95.toFixed(2)}%
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">
              1-day potential loss
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">VaR 99%</div>
            <div className="metric-value text-red-400">
              -{metrics.var99.toFixed(2)}%
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">
              Extreme scenario
            </div>
          </div>
        </div>
      </div>

      {/* Volatility & Beta */}
      <div className="panel p-3">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-white">Volatility & Beta</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="metric-card">
            <div className="metric-label">Volatility</div>
            <div className={`metric-value ${metrics.volatility > 30 ? "text-red-400" : metrics.volatility > 20 ? "text-yellow-400" : "text-green-400"}`}>
              {metrics.volatility.toFixed(1)}%
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">
              Annualized
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Beta</div>
            <div className={`metric-value ${metrics.beta > 1.2 ? "text-red-400" : metrics.beta < 0.8 ? "text-green-400" : "text-white"}`}>
              {metrics.beta.toFixed(2)}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">
              vs Market
            </div>
          </div>
        </div>
      </div>

      {/* Risk-Adjusted Returns */}
      <div className="panel p-3">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-white">Risk-Adjusted Returns</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="metric-card">
            <div className="metric-label">Sharpe</div>
            <div className={`metric-value text-sm ${metrics.sharpeRatio > 1 ? "text-green-400" : metrics.sharpeRatio > 0 ? "text-yellow-400" : "text-red-400"}`}>
              {metrics.sharpeRatio.toFixed(2)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Sortino</div>
            <div className={`metric-value text-sm ${metrics.sortinoRatio > 1.5 ? "text-green-400" : metrics.sortinoRatio > 0 ? "text-yellow-400" : "text-red-400"}`}>
              {metrics.sortinoRatio.toFixed(2)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Calmar</div>
            <div className={`metric-value text-sm ${metrics.calmarRatio > 1 ? "text-green-400" : metrics.calmarRatio > 0 ? "text-yellow-400" : "text-red-400"}`}>
              {metrics.calmarRatio.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Drawdown */}
      <div className="panel p-3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-semibold text-white">Drawdown Analysis</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="metric-card">
            <div className="metric-label flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Max Drawdown
            </div>
            <div className="metric-value text-red-400">
              -{metrics.maxDrawdown.toFixed(2)}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Duration
            </div>
            <div className="metric-value text-white">
              {metrics.maxDrawdownDuration} days
            </div>
          </div>
        </div>
      </div>

      {/* Risk Rating */}
      <div className="panel p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Overall Risk Rating</span>
          <RiskBadge metrics={metrics} />
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ metrics }: { metrics: RiskMetrics }) {
  // Calculate overall risk score
  let score = 0;
  
  if (metrics.volatility > 40) score += 3;
  else if (metrics.volatility > 25) score += 2;
  else if (metrics.volatility > 15) score += 1;
  
  if (metrics.maxDrawdown > 30) score += 3;
  else if (metrics.maxDrawdown > 20) score += 2;
  else if (metrics.maxDrawdown > 10) score += 1;
  
  if (metrics.beta > 1.5) score += 2;
  else if (metrics.beta > 1.2) score += 1;
  
  if (metrics.var99 > 5) score += 2;
  else if (metrics.var99 > 3) score += 1;

  let rating: string;
  let color: string;
  
  if (score <= 2) {
    rating = "Low Risk";
    color = "bg-green-500/20 text-green-400 border-green-500/30";
  } else if (score <= 5) {
    rating = "Moderate";
    color = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  } else if (score <= 8) {
    rating = "High Risk";
    color = "bg-orange-500/20 text-orange-400 border-orange-500/30";
  } else {
    rating = "Very High";
    color = "bg-red-500/20 text-red-400 border-red-500/30";
  }

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded border ${color}`}>
      {rating}
    </span>
  );
}
