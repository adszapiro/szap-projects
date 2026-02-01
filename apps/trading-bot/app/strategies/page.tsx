"use client";

import { useState, useEffect } from "react";
import { Play, Pause, Settings, Trash2, Plus, Code, AlertTriangle } from "lucide-react";
import { Strategy, DEFAULT_STRATEGIES } from "@/lib/types";

const STRATEGIES_STORAGE_KEY = "trading-bot-strategies";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [botEnabled, setBotEnabled] = useState(false);

  // Load strategies from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STRATEGIES_STORAGE_KEY);
    if (saved) {
      try {
        setStrategies(JSON.parse(saved));
      } catch {
        setStrategies(DEFAULT_STRATEGIES);
      }
    } else {
      setStrategies(DEFAULT_STRATEGIES);
    }
  }, []);

  // Save strategies to localStorage
  useEffect(() => {
    if (strategies.length > 0) {
      localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(strategies));
    }
  }, [strategies]);

  const toggleStrategy = (id: string) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const deleteStrategy = (id: string) => {
    if (!confirm("Delete this strategy?")) return;
    setStrategies((prev) => prev.filter((s) => s.id !== id));
    if (selectedStrategy?.id === id) {
      setSelectedStrategy(null);
    }
  };

  const updateStrategy = (updated: Strategy) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    setSelectedStrategy(updated);
    setIsEditing(false);
  };

  const addNewStrategy = () => {
    const newStrategy: Strategy = {
      id: `custom-${Date.now()}`,
      name: "New Strategy",
      description: "Custom trading strategy",
      enabled: false,
      symbol: "SPY",
      side: "long",
      positionSize: 5,
      maxPositionSize: 5000,
      stopLoss: 2,
      takeProfit: 5,
      code: `// Custom Strategy
function generateSignal(data, position) {
  // data.close = array of closing prices
  // data.high = array of high prices
  // data.low = array of low prices
  // data.volume = array of volumes
  // position = current position info or null
  
  // Return: { type: 'buy'|'sell'|'hold', confidence: 0-1, reason: string }
  return { type: 'hold', confidence: 0.5, reason: 'No signal' };
}`,
    };
    setStrategies((prev) => [...prev, newStrategy]);
    setSelectedStrategy(newStrategy);
    setIsEditing(true);
  };

  const activeStrategies = strategies.filter((s) => s.enabled);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Strategy Manager</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Configure and enable automated trading strategies
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">
                Auto-trading:
              </span>
              <button
                onClick={() => setBotEnabled(!botEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  botEnabled ? "bg-green-500" : "bg-[var(--bg-tertiary)]"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    botEnabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            >
              Back to Trading
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Warning Banner */}
        {botEnabled && activeStrategies.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-500">Auto-trading is ENABLED</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {activeStrategies.length} strateg{activeStrategies.length === 1 ? "y" : "ies"} will execute trades automatically.
                This is paper trading - no real money at risk.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Strategy List */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
              <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <h2 className="font-semibold">Strategies</h2>
                <button
                  onClick={addNewStrategy}
                  className="p-1.5 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 rounded transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="divide-y divide-[var(--border-color)]">
                {strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    onClick={() => {
                      setSelectedStrategy(strategy);
                      setIsEditing(false);
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedStrategy?.id === strategy.id
                        ? "bg-[var(--bg-tertiary)]"
                        : "hover:bg-[var(--bg-tertiary)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{strategy.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStrategy(strategy.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          strategy.enabled
                            ? "text-green-500 bg-green-500/10"
                            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        }`}
                      >
                        {strategy.enabled ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-2">
                      {strategy.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-[var(--bg-primary)] rounded">
                        {strategy.symbol}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          strategy.side === "long"
                            ? "bg-green-500/20 text-green-400"
                            : strategy.side === "short"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {strategy.side.toUpperCase()}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {strategy.positionSize}% size
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strategy Details */}
          <div className="col-span-12 lg:col-span-8">
            {selectedStrategy ? (
              <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold">{selectedStrategy.name}</h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        selectedStrategy.enabled
                          ? "bg-green-500/20 text-green-400"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                      }`}
                    >
                      {selectedStrategy.enabled ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded transition-colors"
                    >
                      {isEditing ? <Code className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteStrategy(selectedStrategy.id)}
                      className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <StrategyEditor
                    strategy={selectedStrategy}
                    onSave={updateStrategy}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <div className="p-6 space-y-6">
                    <p className="text-[var(--text-secondary)]">
                      {selectedStrategy.description}
                    </p>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                        <span className="text-xs text-[var(--text-muted)]">Symbol</span>
                        <p className="font-medium">{selectedStrategy.symbol}</p>
                      </div>
                      <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                        <span className="text-xs text-[var(--text-muted)]">Position Size</span>
                        <p className="font-medium">{selectedStrategy.positionSize}%</p>
                      </div>
                      <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                        <span className="text-xs text-[var(--text-muted)]">Max Size</span>
                        <p className="font-medium">${selectedStrategy.maxPositionSize.toLocaleString()}</p>
                      </div>
                      <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                        <span className="text-xs text-[var(--text-muted)]">Side</span>
                        <p className="font-medium capitalize">{selectedStrategy.side}</p>
                      </div>
                      <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                        <span className="text-xs text-[var(--text-muted)]">Stop Loss</span>
                        <p className="font-medium text-red-400">
                          {selectedStrategy.stopLoss ? `-${selectedStrategy.stopLoss}%` : "None"}
                        </p>
                      </div>
                      <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                        <span className="text-xs text-[var(--text-muted)]">Take Profit</span>
                        <p className="font-medium text-green-400">
                          {selectedStrategy.takeProfit ? `+${selectedStrategy.takeProfit}%` : "None"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Strategy Code</h3>
                      <pre className="bg-[var(--bg-primary)] p-4 rounded-lg text-xs overflow-x-auto">
                        <code>{selectedStrategy.code}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-12 text-center">
                <Code className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Strategy</h3>
                <p className="text-[var(--text-secondary)]">
                  Choose a strategy from the list to view details and configure settings
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Strategy Editor Component
function StrategyEditor({
  strategy,
  onSave,
  onCancel,
}: {
  strategy: Strategy;
  onSave: (s: Strategy) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(strategy);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Strategy Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Symbol
          </label>
          <input
            type="text"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Description
        </label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Side
          </label>
          <select
            value={form.side}
            onChange={(e) => setForm({ ...form, side: e.target.value as Strategy["side"] })}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Position Size (%)
          </label>
          <input
            type="number"
            value={form.positionSize}
            onChange={(e) => setForm({ ...form, positionSize: parseFloat(e.target.value) })}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Stop Loss (%)
          </label>
          <input
            type="number"
            value={form.stopLoss || ""}
            onChange={(e) => setForm({ ...form, stopLoss: parseFloat(e.target.value) || undefined })}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Take Profit (%)
          </label>
          <input
            type="number"
            value={form.takeProfit || ""}
            onChange={(e) => setForm({ ...form, takeProfit: parseFloat(e.target.value) || undefined })}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Strategy Code (JavaScript)
        </label>
        <textarea
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          rows={12}
          className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--accent-blue)] hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          Save Strategy
        </button>
      </div>
    </form>
  );
}
