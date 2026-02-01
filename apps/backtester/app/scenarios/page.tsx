"use client";

import { useState } from "react";
import { TrendingUp, Loader2, Play, AlertTriangle, Calendar, TrendingDown } from "lucide-react";
import Link from "next/link";
import { HISTORICAL_SCENARIOS, Scenario, ScenarioResult } from "@/lib/attribution";
import { fetchMarketData } from "@/lib/data";
import { executeStrategy } from "@/lib/engine/executor";
import { calculateRiskMetrics } from "@/lib/risk";

const DEFAULT_STRATEGY = `function strategy(data, indicators, context) {
  const prices = data.map(d => d.close);
  const sma20 = indicators.sma(prices, 20);
  const sma50 = indicators.sma(prices, 50);
  
  for (let i = 50; i < data.length; i++) {
    const prevFast = sma20[i - 1];
    const prevSlow = sma50[i - 1];
    const currFast = sma20[i];
    const currSlow = sma50[i];
    
    if (prevFast <= prevSlow && currFast > currSlow && !context.position) {
      context.buy(i);
    }
    
    if (prevFast >= prevSlow && currFast < currSlow && context.position) {
      context.sell(i);
    }
  }
}`;

export default function ScenariosPage() {
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState("SPY");
  const [strategyCode, setStrategyCode] = useState(DEFAULT_STRATEGY);

  const runScenario = async (scenario: Scenario) => {
    setRunningScenario(scenario.name);
    
    try {
      // Fetch data for the scenario period
      const data = await fetchMarketData(
        selectedAsset,
        "stock",
        scenario.startDate,
        scenario.endDate
      );

      if (data.length < 20) {
        console.error("Not enough data for scenario");
        return;
      }

      // Run strategy
      const executionResult = executeStrategy(strategyCode, data, 10000);
      
      if (!executionResult.success || !executionResult.result) {
        console.error("Strategy failed:", executionResult.error);
        return;
      }

      // Calculate metrics
      const riskMetrics = calculateRiskMetrics(data);
      
      const result: ScenarioResult = {
        scenario,
        return: executionResult.result.metrics.totalReturnPercent,
        maxDrawdown: riskMetrics.maxDrawdown,
        volatility: riskMetrics.volatility,
        sharpeRatio: riskMetrics.sharpeRatio,
      };

      setResults(prev => {
        const filtered = prev.filter(r => r.scenario.name !== scenario.name);
        return [...filtered, result].sort((a, b) => 
          HISTORICAL_SCENARIOS.findIndex(s => s.name === a.scenario.name) -
          HISTORICAL_SCENARIOS.findIndex(s => s.name === b.scenario.name)
        );
      });
    } catch (error) {
      console.error("Scenario failed:", error);
    } finally {
      setRunningScenario(null);
    }
  };

  const runAllScenarios = async () => {
    setLoading(true);
    setResults([]);

    for (const scenario of HISTORICAL_SCENARIOS) {
      await runScenario(scenario);
    }

    setLoading(false);
  };

  const getResultForScenario = (scenarioName: string) => {
    return results.find(r => r.scenario.name === scenarioName);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">AlgoBacktest</span>
          </Link>
          <div className="h-6 w-px bg-[var(--border-color)]" />
          <h1 className="text-sm font-medium text-white">Scenario Analysis</h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="text-xs"
          >
            <option value="SPY">SPY (S&P 500)</option>
            <option value="QQQ">QQQ (Nasdaq)</option>
            <option value="IWM">IWM (Russell 2000)</option>
            <option value="DIA">DIA (Dow Jones)</option>
          </select>

          <button
            onClick={runAllScenarios}
            disabled={loading}
            className="btn btn-primary text-xs"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run All Scenarios
          </button>

          <Link href="/" className="btn btn-secondary text-xs">
            Back to Backtester
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Intro */}
          <div className="panel p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-white mb-1">Stress Test Your Strategy</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  See how your strategy would have performed during major market events.
                  This helps identify weaknesses and understand tail risk.
                </p>
              </div>
            </div>
          </div>

          {/* Scenarios Grid */}
          <div className="grid grid-cols-2 gap-4">
            {HISTORICAL_SCENARIOS.map((scenario) => {
              const result = getResultForScenario(scenario.name);
              const isRunning = runningScenario === scenario.name;

              return (
                <div key={scenario.name} className="panel p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{scenario.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{scenario.description}</p>
                    </div>
                    <button
                      onClick={() => runScenario(scenario)}
                      disabled={isRunning || loading}
                      className="btn btn-secondary text-xs py-1 px-2"
                    >
                      {isRunning ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                    <Calendar className="w-3 h-3" />
                    {scenario.startDate} to {scenario.endDate}
                  </div>

                  <div className="text-xs text-[var(--text-secondary)] mb-4 italic">
                    Expected: {scenario.expectedImpact}
                  </div>

                  {result ? (
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-[var(--bg-tertiary)] rounded p-2">
                        <div className="text-[10px] text-[var(--text-muted)]">Return</div>
                        <div className={`text-sm font-semibold ${result.return >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {result.return >= 0 ? "+" : ""}{result.return.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-[var(--bg-tertiary)] rounded p-2">
                        <div className="text-[10px] text-[var(--text-muted)]">Drawdown</div>
                        <div className="text-sm font-semibold text-red-400">
                          -{result.maxDrawdown.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-[var(--bg-tertiary)] rounded p-2">
                        <div className="text-[10px] text-[var(--text-muted)]">Volatility</div>
                        <div className="text-sm font-semibold text-white">
                          {result.volatility.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-[var(--bg-tertiary)] rounded p-2">
                        <div className="text-[10px] text-[var(--text-muted)]">Sharpe</div>
                        <div className={`text-sm font-semibold ${result.sharpeRatio > 0 ? "text-green-400" : "text-red-400"}`}>
                          {result.sharpeRatio.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--text-muted)] text-center py-4 bg-[var(--bg-tertiary)] rounded">
                      Click play to run scenario
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Table */}
          {results.length > 0 && (
            <div className="panel p-4 mt-6">
              <h3 className="text-sm font-semibold text-white mb-4">Results Summary</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                    <th className="text-left py-2">Scenario</th>
                    <th className="text-right py-2">Return</th>
                    <th className="text-right py-2">Max Drawdown</th>
                    <th className="text-right py-2">Volatility</th>
                    <th className="text-right py-2">Sharpe</th>
                    <th className="text-right py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    // Grade the performance
                    let grade = "F";
                    let gradeColor = "text-red-400";
                    if (result.return > 0 && result.maxDrawdown < 20) {
                      grade = "A";
                      gradeColor = "text-green-400";
                    } else if (result.return > -10 && result.maxDrawdown < 30) {
                      grade = "B";
                      gradeColor = "text-blue-400";
                    } else if (result.return > -20 && result.maxDrawdown < 40) {
                      grade = "C";
                      gradeColor = "text-yellow-400";
                    } else if (result.return > -30) {
                      grade = "D";
                      gradeColor = "text-orange-400";
                    }

                    return (
                      <tr key={result.scenario.name} className="border-b border-[var(--border-color)]">
                        <td className="py-2 text-white">{result.scenario.name}</td>
                        <td className={`py-2 text-right font-medium ${result.return >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {result.return >= 0 ? "+" : ""}{result.return.toFixed(2)}%
                        </td>
                        <td className="py-2 text-right text-red-400">-{result.maxDrawdown.toFixed(2)}%</td>
                        <td className="py-2 text-right text-[var(--text-secondary)]">{result.volatility.toFixed(1)}%</td>
                        <td className={`py-2 text-right ${result.sharpeRatio > 0 ? "text-green-400" : "text-red-400"}`}>
                          {result.sharpeRatio.toFixed(2)}
                        </td>
                        <td className={`py-2 text-right font-bold ${gradeColor}`}>{grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
