"use client";

import dynamic from "next/dynamic";
import { Play, PlayCircle, FileCode, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface StrategyEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onRunAll?: () => void;
  loading: boolean;
  runningAll?: boolean;
  selectedTemplate: string;
  onTemplateChange: (template: string) => void;
  watchlistCount?: number;
}

const templates: Record<string, { name: string; code: string }> = {
  sma_crossover: {
    name: "SMA Crossover",
    code: `// SMA Crossover Strategy
// Buy on golden cross, sell on death cross

function strategy(data, indicators, context) {
  const prices = data.map(d => d.close);
  const sma20 = indicators.sma(prices, 20);
  const sma50 = indicators.sma(prices, 50);
  
  for (let i = 50; i < data.length; i++) {
    const prevFast = sma20[i - 1];
    const prevSlow = sma50[i - 1];
    const currFast = sma20[i];
    const currSlow = sma50[i];
    
    // Golden cross - buy
    if (prevFast <= prevSlow && currFast > currSlow && !context.position) {
      context.buy(i);
    }
    
    // Death cross - sell
    if (prevFast >= prevSlow && currFast < currSlow && context.position) {
      context.sell(i);
    }
  }
}`,
  },
  rsi: {
    name: "RSI Overbought/Oversold",
    code: `// RSI Strategy
// Buy when oversold (<30), sell when overbought (>70)

function strategy(data, indicators, context) {
  const prices = data.map(d => d.close);
  const rsiValues = indicators.rsi(prices, 14);
  
  for (let i = 14; i < data.length; i++) {
    const prevRsi = rsiValues[i - 1];
    const currRsi = rsiValues[i];
    
    // RSI crosses above 30 - buy signal
    if (prevRsi <= 30 && currRsi > 30 && !context.position) {
      context.buy(i);
    }
    
    // RSI crosses below 70 - sell signal
    if (prevRsi >= 70 && currRsi < 70 && context.position) {
      context.sell(i);
    }
  }
}`,
  },
  macd: {
    name: "MACD Crossover",
    code: `// MACD Strategy
// Buy on bullish crossover, sell on bearish crossover

function strategy(data, indicators, context) {
  const prices = data.map(d => d.close);
  const { macd, signal } = indicators.macd(prices, 12, 26, 9);
  
  for (let i = 35; i < data.length; i++) {
    if (macd[i] === null || signal[i] === null) continue;
    if (macd[i-1] === null || signal[i-1] === null) continue;
    
    // Bullish crossover
    if (macd[i-1] <= signal[i-1] && macd[i] > signal[i] && !context.position) {
      context.buy(i);
    }
    
    // Bearish crossover
    if (macd[i-1] >= signal[i-1] && macd[i] < signal[i] && context.position) {
      context.sell(i);
    }
  }
}`,
  },
  bollinger: {
    name: "Bollinger Bounce",
    code: `// Bollinger Bands Strategy
// Buy at lower band, sell at upper band

function strategy(data, indicators, context) {
  const prices = data.map(d => d.close);
  const { upper, lower } = indicators.bollinger(prices, 20, 2);
  
  for (let i = 20; i < data.length; i++) {
    if (upper[i] === null || lower[i] === null) continue;
    
    const price = prices[i];
    
    // Price touches lower band - buy
    if (price <= lower[i] && !context.position) {
      context.buy(i);
    }
    
    // Price touches upper band - sell
    if (price >= upper[i] && context.position) {
      context.sell(i);
    }
  }
}`,
  },
  custom: {
    name: "Custom Strategy",
    code: `// Custom Strategy Template
// Write your own trading logic!

function strategy(data, indicators, context) {
  const prices = data.map(d => d.close);
  
  // Available indicators:
  // - indicators.sma(prices, period)
  // - indicators.ema(prices, period)
  // - indicators.rsi(prices, period)
  // - indicators.macd(prices, fast, slow, signal)
  // - indicators.bollinger(prices, period, stdDev)
  
  // Trading actions:
  // - context.buy(index)  - Enter long position
  // - context.sell(index) - Exit position
  // - context.position    - true if currently holding
  
  for (let i = 50; i < data.length; i++) {
    // Your logic here
  }
}`,
  },
};

export default function StrategyEditor({
  code,
  onChange,
  onRun,
  onRunAll,
  loading,
  runningAll = false,
  selectedTemplate,
  onTemplateChange,
  watchlistCount = 0,
}: StrategyEditorProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const handleTemplateSelect = (templateKey: string) => {
    onTemplateChange(templateKey);
    onChange(templates[templateKey].code);
    setShowTemplates(false);
  };

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <FileCode className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            Strategy Editor
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Template Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="btn btn-secondary text-xs flex items-center gap-2"
            >
              {templates[selectedTemplate]?.name || "Select Template"}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showTemplates && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden">
                {Object.entries(templates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => handleTemplateSelect(key)}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-hover)] transition-colors ${
                      selectedTemplate === key
                        ? "bg-[var(--bg-hover)] text-blue-400"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Run Button */}
          <button
            onClick={onRun}
            disabled={loading}
            className="btn btn-success text-xs"
          >
            {loading && !runningAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run
          </button>

          {/* Run All Button */}
          {onRunAll && watchlistCount > 1 && (
            <button
              onClick={onRunAll}
              disabled={loading}
              className="btn btn-primary text-xs"
            >
              {runningAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              Run All ({watchlistCount})
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={(value) => onChange(value || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}
