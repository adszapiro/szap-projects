import { PerformanceMetrics } from "@/lib/types";

interface MetricsCardProps {
  metrics: PerformanceMetrics;
}

export default function MetricsCard({ metrics }: MetricsCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const metricsData = [
    {
      label: "Total Return",
      value: formatCurrency(metrics.totalReturn),
      subValue: formatPercent(metrics.totalReturnPercent),
      isPositive: metrics.totalReturn >= 0,
      icon: metrics.totalReturn >= 0 ? "📈" : "📉",
    },
    {
      label: "Final Value",
      value: formatCurrency(metrics.finalValue),
      subValue: `from ${formatCurrency(metrics.initialCapital)}`,
      isPositive: true,
      icon: "💰",
    },
    {
      label: "Sharpe Ratio",
      value: metrics.sharpeRatio.toFixed(2),
      subValue: metrics.sharpeRatio > 1 ? "Good" : metrics.sharpeRatio > 0.5 ? "Moderate" : "Low",
      isPositive: metrics.sharpeRatio > 0,
      icon: "⚖️",
    },
    {
      label: "Max Drawdown",
      value: formatPercent(-metrics.maxDrawdownPercent),
      subValue: formatCurrency(-metrics.maxDrawdown),
      isPositive: false,
      icon: "📉",
    },
    {
      label: "Win Rate",
      value: `${metrics.winRate.toFixed(1)}%`,
      subValue: `${metrics.numberOfTrades} trades`,
      isPositive: metrics.winRate > 50,
      icon: "🎯",
    },
    {
      label: "Avg Duration",
      value: `${Math.round(metrics.avgTradeDuration)} days`,
      subValue: "per trade",
      isPositive: true,
      icon: "⏱️",
    },
  ];

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Performance Metrics
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metricsData.map((metric) => (
          <div
            key={metric.label}
            className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{metric.icon}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {metric.label}
              </span>
            </div>
            <div
              className={`text-xl font-bold ${
                metric.label === "Max Drawdown"
                  ? "text-red-600 dark:text-red-400"
                  : metric.isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {metric.value}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {metric.subValue}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
