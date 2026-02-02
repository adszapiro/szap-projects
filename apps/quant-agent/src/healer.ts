/**
 * Self-Healing Agent Module
 * 
 * Monitors for errors, detects broken strategies, and automatically fixes them.
 * Uses AI to analyze errors and generate fixes.
 */

import { getSupabase, log } from "./db.js";

// Track error counts per strategy
const errorCounts = new Map<string, number>();
const MAX_ERRORS_BEFORE_HEAL = 3;

// Track recent errors for pattern detection
interface ErrorLog {
  strategyId: string;
  error: string;
  timestamp: Date;
  symbol: string;
}
const recentErrors: ErrorLog[] = [];

/**
 * Record a strategy execution error
 */
export async function recordError(
  strategyId: string,
  error: string,
  symbol: string
): Promise<void> {
  // Track error count
  const count = (errorCounts.get(strategyId) || 0) + 1;
  errorCounts.set(strategyId, count);
  
  // Add to recent errors
  recentErrors.push({
    strategyId,
    error,
    symbol,
    timestamp: new Date(),
  });
  
  // Keep only last 100 errors
  if (recentErrors.length > 100) {
    recentErrors.shift();
  }
  
  // Check if we need to heal this strategy
  if (count >= MAX_ERRORS_BEFORE_HEAL) {
    await healStrategy(strategyId, error);
  }
}

/**
 * Attempt to heal a broken strategy
 */
async function healStrategy(strategyId: string, lastError: string): Promise<void> {
  try {
    await log("warning", "strategy_healing_started", { 
      strategy_id: strategyId, 
      error: lastError,
      error_count: errorCounts.get(strategyId),
    });
    
    // Get the strategy from database
    const { data: strategy, error: fetchError } = await getSupabase()
      .from("strategies")
      .select("*")
      .eq("id", strategyId)
      .single();
    
    if (fetchError || !strategy) {
      await log("error", "strategy_heal_failed", { reason: "Strategy not found", strategy_id: strategyId });
      return;
    }
    
    // Analyze the error and generate a fix
    const fixedCode = await generateFix(strategy.code, lastError);
    
    if (fixedCode) {
      // Update the strategy with fixed code
      const { error: updateError } = await getSupabase()
        .from("strategies")
        .update({ 
          code: fixedCode,
          description: `${strategy.description} [Auto-healed: ${new Date().toISOString()}]`,
        })
        .eq("id", strategyId);
      
      if (updateError) {
        await log("error", "strategy_heal_update_failed", { error: updateError.message });
      } else {
        // Reset error count
        errorCounts.set(strategyId, 0);
        await log("info", "strategy_healed", { strategy_id: strategyId });
      }
    } else {
      // Could not fix - disable the strategy
      await disableStrategy(strategyId, lastError);
    }
  } catch (error) {
    await log("error", "strategy_heal_exception", { error: String(error) });
  }
}

/**
 * Generate a fix for broken strategy code
 */
async function generateFix(originalCode: string, error: string): Promise<string | null> {
  // Common error patterns and fixes
  const fixes: Array<{ pattern: RegExp; fix: (code: string) => string }> = [
    // Fix: accessing .length on undefined
    {
      pattern: /Cannot read properties of undefined \(reading 'length'\)/,
      fix: (code) => {
        // Add safety checks for array access
        return `
// Safety: Ensure arrays exist before accessing
function safeLength(arr) { return Array.isArray(arr) ? arr.length : 0; }
function safeSlice(arr, start, end) { return Array.isArray(arr) ? arr.slice(start, end) : []; }
function safeLast(arr) { return Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : 0; }

${code.replace(/(\w+)\.length/g, 'safeLength($1)')
      .replace(/(\w+)\.slice\(/g, 'safeSlice($1, ')
      .replace(/(\w+)\[(\w+)\.length\s*-\s*1\]/g, 'safeLast($1)')}
`;
      }
    },
    // Fix: undefined is not iterable
    {
      pattern: /undefined is not iterable/,
      fix: (code) => {
        return `
// Safety: Default empty arrays
${code.replace(/for\s*\(\s*(const|let|var)\s+(\w+)\s+of\s+(\w+)/g, 
  'for ($1 $2 of ($3 || [])').replace(/\.map\(/g, '?.map(').replace(/\.filter\(/g, '?.filter(')}
`;
      }
    },
    // Fix: Cannot read properties of undefined (reading 'close')
    {
      pattern: /Cannot read properties of undefined \(reading '(close|open|high|low|volume)'\)/,
      fix: (code) => {
        return `
// Safety: Validate data structure
if (!data || !data.close || !data.close.length) {
  return { type: "hold", confidence: 0, reason: "Invalid data" };
}
${code}
`;
      }
    },
  ];
  
  // Try to match error pattern and apply fix
  for (const { pattern, fix } of fixes) {
    if (pattern.test(error)) {
      try {
        const fixedCode = fix(originalCode);
        
        // Validate the fix compiles
        new Function("data", "position", "SMA", "EMA", "RSI", `
          ${fixedCode}
          return generateSignal(data, position);
        `);
        
        return fixedCode;
      } catch {
        // Fix didn't compile, try next pattern
        continue;
      }
    }
  }
  
  // No automatic fix available
  return null;
}

/**
 * Disable a strategy that cannot be fixed
 */
async function disableStrategy(strategyId: string, reason: string): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from("strategies")
      .update({ 
        status: "disabled",
        description: `[DISABLED - Auto: ${reason}]`,
      })
      .eq("id", strategyId);
    
    if (!error) {
      await log("warning", "strategy_disabled", { 
        strategy_id: strategyId, 
        reason: "Could not auto-fix",
        last_error: reason,
      });
    }
  } catch (error) {
    await log("error", "strategy_disable_failed", { error: String(error) });
  }
}

/**
 * Get health status of all strategies
 */
export function getHealthStatus(): {
  totalErrors: number;
  strategiesWithErrors: number;
  recentErrorRate: number;
} {
  const now = Date.now();
  const recentWindow = 15 * 60 * 1000; // 15 minutes
  
  const recentCount = recentErrors.filter(
    e => now - e.timestamp.getTime() < recentWindow
  ).length;
  
  return {
    totalErrors: recentErrors.length,
    strategiesWithErrors: errorCounts.size,
    recentErrorRate: recentCount / (recentWindow / 60000), // errors per minute
  };
}

/**
 * Clear error counts (call after successful cycles)
 */
export function clearSuccessfulStrategy(strategyId: string): void {
  errorCounts.delete(strategyId);
}

/**
 * Generate a replacement strategy when healing fails
 */
export async function generateReplacementStrategy(
  assetClass: "stock" | "crypto",
  symbols: string[]
): Promise<string> {
  // Simple, robust default strategy that won't crash
  return `
// Safe Default Strategy - Auto-generated replacement
function generateSignal(data, position) {
  // Validate inputs
  if (!data || !Array.isArray(data.close) || data.close.length < 20) {
    return { type: "hold", confidence: 0, reason: "Insufficient data" };
  }
  
  const closes = data.close;
  const len = closes.length;
  
  // Simple moving average crossover
  const shortPeriod = 5;
  const longPeriod = 20;
  
  if (len < longPeriod) {
    return { type: "hold", confidence: 0, reason: "Need more data" };
  }
  
  // Calculate SMAs safely
  const shortSMA = closes.slice(-shortPeriod).reduce((a, b) => a + b, 0) / shortPeriod;
  const longSMA = closes.slice(-longPeriod).reduce((a, b) => a + b, 0) / longPeriod;
  
  const currentPrice = closes[len - 1];
  const priceAboveShort = currentPrice > shortSMA;
  const shortAboveLong = shortSMA > longSMA;
  
  // Generate signal
  if (priceAboveShort && shortAboveLong && !position) {
    return { 
      type: "buy", 
      confidence: 0.75, 
      reason: "Price above short SMA, short SMA above long SMA - uptrend" 
    };
  }
  
  if (!priceAboveShort && !shortAboveLong && position) {
    return { 
      type: "sell", 
      confidence: 0.75, 
      reason: "Price below short SMA, short SMA below long SMA - downtrend" 
    };
  }
  
  return { type: "hold", confidence: 0.5, reason: "No clear signal" };
}
`;
}
