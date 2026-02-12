/**
 * Sandboxed strategy execution using Node's vm module.
 * Prevents strategy code from accessing Node.js globals like
 * require, process, fetch, global, Buffer, etc.
 */

import vm from "node:vm";

// Allowlisted math/utility functions strategies can use
function SMA(arr: number[], period: number): number {
  if (arr.length < period) return arr[arr.length - 1] || 0;
  const slice = arr.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function EMA(arr: number[], period: number): number {
  if (arr.length < period) return arr[arr.length - 1] || 0;
  const k = 2 / (period + 1);
  let ema = arr[0];
  for (let i = 1; i < arr.length; i++) {
    ema = arr[i] * k + ema * (1 - k);
  }
  return ema;
}

function RSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  return 100 - (100 / (1 + rs));
}

export interface StrategyData {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface StrategyPosition {
  qty: number;
  avgEntryPrice: number;
  side?: string;
}

export interface StrategySignalResult {
  type: "buy" | "sell" | "hold";
  confidence: number;
  reason: string;
  stopLoss?: number;
  takeProfit?: number;
  positionSize?: number;
}

const HOLD_SIGNAL: StrategySignalResult = { type: "hold", confidence: 0, reason: "No signal" };

/**
 * Execute strategy code in a sandboxed VM context.
 * Only data, position, and math helpers are available.
 * No access to require, process, fetch, global, setTimeout, etc.
 */
export function executeSandboxed(
  code: string,
  data: StrategyData,
  position: StrategyPosition | null,
  timeoutMs: number = 1000,
): StrategySignalResult {
  try {
    if (!data || !data.close || data.close.length === 0) {
      return { ...HOLD_SIGNAL, reason: "No data available" };
    }

    const wrappedCode = `
      ${code}

      try {
        const __result = generateSignal(data, position);
        __result;
      } catch (e) {
        ({ type: "hold", confidence: 0, reason: "Strategy error: " + e.message });
      }
    `;

    // Create a restricted context - only expose what strategies need
    const sandbox = {
      data: Object.freeze({ ...data }),
      position: position ? Object.freeze({ ...position }) : null,
      SMA,
      EMA,
      RSI,
      Math,
      Number,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      JSON: { parse: JSON.parse, stringify: JSON.stringify },
    };

    const context = vm.createContext(sandbox, {
      codeGeneration: { strings: false, wasm: false },
    });

    const script = new vm.Script(wrappedCode, {
      filename: "strategy.js",
    });

    const result = script.runInContext(context, { timeout: timeoutMs });

    return {
      type: result?.type || "hold",
      confidence: typeof result?.confidence === "number" ? result.confidence : 0,
      reason: result?.reason || "No reason provided",
      stopLoss: typeof result?.stopLoss === "number" ? result.stopLoss : undefined,
      takeProfit: typeof result?.takeProfit === "number" ? result.takeProfit : undefined,
      positionSize: typeof result?.positionSize === "number" ? result.positionSize : undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { type: "hold", confidence: 0, reason: `Sandbox error: ${msg}` };
  }
}

/**
 * Validate that strategy code compiles without executing it.
 */
export function validateStrategyCode(code: string): { valid: boolean; error?: string } {
  try {
    if (!code.includes("generateSignal")) {
      return { valid: false, error: "Missing generateSignal function" };
    }
    if (!code.includes("return")) {
      return { valid: false, error: "Missing return statement" };
    }
    // Just try to compile, don't execute
    new vm.Script(code, { filename: "strategy-validate.js" });
    return { valid: true };
  } catch (error) {
    return { valid: false, error: String(error) };
  }
}
