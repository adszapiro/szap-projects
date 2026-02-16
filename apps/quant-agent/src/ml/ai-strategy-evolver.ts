/**
 * AI Strategy Evolver
 *
 * Uses Claude to generate new strategies based on loss analysis.
 * When a strategy performs poorly, this system:
 * 1. Analyzes WHY it failed (loss patterns)
 * 2. Sends the analysis to Claude
 * 3. Claude generates an improved strategy
 * 4. The new strategy replaces the old one
 */

import Anthropic from "@anthropic-ai/sdk";
import { getSupabase, log, Strategy, AssetClass } from "../db.js";
import { getStrategiesWithPerformance, StrategyWithPerformance } from "../db.js";

const anthropic = new Anthropic();

// Loss pattern types
type LossPattern =
  | "volatility_spike"
  | "false_breakout"
  | "trend_reversal"
  | "bad_timing"
  | "overtrading"
  | "unknown";

interface LossAnalysis {
  strategyId: string;
  strategyName: string;
  assetClass: AssetClass;
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  lossPatterns: { pattern: LossPattern; count: number }[];
  recentLosses: {
    symbol: string;
    pnl: number;
    entryPrice: number;
    exitPrice: number;
    reason: string;
  }[];
  originalCode: string;
}

interface GeneratedStrategy {
  name: string;
  description: string;
  code: string;
  symbols: string[];
  assetClass: AssetClass;
  parentId: string;
}

/**
 * Get the worst performing strategies
 */
async function getWorstPerformers(
  limit: number = 3,
  minTrades: number = 5
): Promise<StrategyWithPerformance[]> {
  const strategies = await getStrategiesWithPerformance();

  // Filter strategies with enough trades to evaluate
  const evaluatable = strategies.filter(
    (s) => s.performance && s.performance.total_trades >= minTrades
  );

  // Sort by total P&L (worst first)
  const sorted = evaluatable.sort((a, b) => {
    const pnlA = a.performance?.total_pnl || 0;
    const pnlB = b.performance?.total_pnl || 0;
    return pnlA - pnlB;
  });

  // Return worst performers with negative P&L
  return sorted.filter((s) => (s.performance?.total_pnl || 0) < 0).slice(0, limit);
}

/**
 * Analyze why a strategy has been losing
 */
async function analyzeStrategyLosses(strategy: StrategyWithPerformance): Promise<LossAnalysis> {
  const supabase = getSupabase();

  // Get recent losing trades for this strategy
  const { data: trades } = await supabase
    .from("agent_trades")
    .select("*")
    .eq("strategy_id", strategy.id)
    .lt("pnl", 0)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get loss analysis logs
  const { data: lossLogs } = await supabase
    .from("agent_logs")
    .select("context")
    .eq("event_type", "loss_analyzed")
    .contains("context", { strategy_id: strategy.id })
    .limit(50);

  // Count loss patterns
  const patternCounts = new Map<LossPattern, number>();
  for (const log of lossLogs || []) {
    const pattern = (log.context as any)?.pattern as LossPattern;
    if (pattern) {
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
    }
  }

  const lossPatterns = Array.from(patternCounts.entries())
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count);

  const recentLosses = (trades || []).slice(0, 5).map((t) => ({
    symbol: t.symbol,
    pnl: t.pnl || 0,
    entryPrice: t.price || 0,
    exitPrice: 0, // Would need to track this
    reason: t.reasoning || "",
  }));

  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    assetClass: strategy.asset_class as AssetClass,
    totalTrades: strategy.performance?.total_trades || 0,
    winRate: strategy.performance ?
      (strategy.performance.winning_trades / Math.max(strategy.performance.total_trades, 1)) : 0.5,
    totalPnl: strategy.performance?.total_pnl || 0,
    lossPatterns,
    recentLosses,
    originalCode: strategy.code || "",
  };
}

/**
 * Use Claude to generate an improved strategy
 */
async function generateImprovedStrategy(analysis: LossAnalysis): Promise<GeneratedStrategy | null> {
  const prompt = `You are an expert quantitative trading strategy developer. A trading strategy has been performing poorly and needs to be replaced with an improved version.

## Failed Strategy Analysis

**Strategy Name:** ${analysis.strategyName}
**Asset Class:** ${analysis.assetClass}
**Total Trades:** ${analysis.totalTrades}
**Win Rate:** ${(analysis.winRate * 100).toFixed(1)}%
**Total P&L:** $${analysis.totalPnl.toFixed(2)}

### Loss Patterns (most common reasons for losses):
${analysis.lossPatterns.map((p) => `- ${p.pattern}: ${p.count} occurrences`).join("\n") || "- No specific patterns identified"}

### Recent Losing Trades:
${analysis.recentLosses.map((l) => `- ${l.symbol}: $${l.pnl.toFixed(2)} | Reason: ${l.reason}`).join("\n") || "- No recent trades"}

### Original Strategy Code:
\`\`\`javascript
${analysis.originalCode}
\`\`\`

## Your Task

Generate a NEW, IMPROVED trading strategy that:
1. Addresses the identified loss patterns
2. Has better risk management
3. Uses different indicators or logic than the original
4. Is specifically designed for ${analysis.assetClass} trading

## Output Format

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "name": "Strategy Name",
  "description": "Brief description of the strategy",
  "symbols": ["SYMBOL1", "SYMBOL2"],
  "code": "function generateSignal(data, position) { ... return { type: 'buy'|'sell'|'hold', confidence: 0-1, reason: 'string' }; }"
}

The code must:
- Be a valid JavaScript function named generateSignal
- Accept (data, position) parameters where data has close[], high[], low[], open[], volume[]
- Return { type: 'buy'|'sell'|'hold', confidence: number 0-1, reason: string }
- Use proper risk management (e.g., don't buy if already have position)
- Handle edge cases (insufficient data, etc.)

${analysis.assetClass === "crypto" ? "Use crypto symbols like BTC/USD, ETH/USD, SOL/USD" : "Use stock symbols like SPY, QQQ, IWM"}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      console.error("Unexpected response type from Claude");
      return null;
    }

    // Parse the JSON response
    const jsonStr = content.text.trim();
    const generated = JSON.parse(jsonStr);

    // Validate the response
    if (!generated.name || !generated.code || !generated.symbols) {
      console.error("Invalid response structure from Claude");
      return null;
    }

    return {
      name: generated.name,
      description: generated.description || "",
      code: generated.code,
      symbols: generated.symbols,
      assetClass: analysis.assetClass,
      parentId: analysis.strategyId,
    };
  } catch (error) {
    console.error("Error generating strategy with Claude:", error);
    return null;
  }
}

/**
 * Deploy a new strategy to the database
 */
async function deployStrategy(strategy: GeneratedStrategy): Promise<string | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("strategies")
    .insert({
      name: strategy.name,
      description: strategy.description,
      code: strategy.code,
      symbols: strategy.symbols,
      asset_class: strategy.assetClass,
      status: "deployed",
      parent_id: strategy.parentId, // Track lineage
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error deploying strategy:", error);
    return null;
  }

  // Initialize performance record
  await supabase.from("strategy_performance").insert({
    strategy_id: data.id,
    alpha: 1,
    beta: 1,
    total_trades: 0,
    winning_trades: 0,
    total_pnl: 0,
    current_weight: 0.1, // Start with decent allocation
  });

  return data.id;
}

/**
 * Retire a poorly performing strategy
 */
async function retireStrategy(strategyId: string, reason: string): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from("strategies")
    .update({
      status: "evolved", // Mark as evolved, not retired
      updated_at: new Date().toISOString(),
    })
    .eq("id", strategyId);

  // Set weight to 0
  await supabase
    .from("strategy_performance")
    .update({ current_weight: 0 })
    .eq("strategy_id", strategyId);

  await log("info", "strategy_evolved", {
    strategy_id: strategyId,
    reason,
  });
}

/**
 * Run the evolution cycle
 * Finds worst performers, generates improvements, deploys them
 */
export async function runEvolutionCycle(): Promise<{
  evolved: number;
  errors: number;
}> {
  console.log("\n🧬 [EVOLUTION] Starting AI strategy evolution cycle...");

  const results = { evolved: 0, errors: 0 };

  try {
    // Find worst performers
    const worstStrategies = await getWorstPerformers(3, 5);

    if (worstStrategies.length === 0) {
      console.log("   No strategies qualify for evolution (need 5+ trades and negative P&L)");
      return results;
    }

    console.log(`   Found ${worstStrategies.length} underperforming strategies`);

    for (const strategy of worstStrategies) {
      console.log(`\n   🔬 Analyzing: ${strategy.name}`);
      console.log(`      P&L: $${strategy.performance?.total_pnl?.toFixed(2) || 0}`);
      const winRate = strategy.performance ?
        (strategy.performance.winning_trades / Math.max(strategy.performance.total_trades, 1)) : 0.5;
      console.log(`      Win Rate: ${(winRate * 100).toFixed(1)}%`);

      // Analyze losses
      const analysis = await analyzeStrategyLosses(strategy);

      // Generate improved strategy
      console.log("      🤖 Generating improved strategy with Claude...");
      const newStrategy = await generateImprovedStrategy(analysis);

      if (!newStrategy) {
        console.log("      ❌ Failed to generate improved strategy");
        results.errors++;
        continue;
      }

      // Deploy new strategy
      console.log(`      📦 Deploying: ${newStrategy.name}`);
      const newId = await deployStrategy(newStrategy);

      if (!newId) {
        console.log("      ❌ Failed to deploy strategy");
        results.errors++;
        continue;
      }

      // Retire old strategy
      console.log(`      🔄 Evolving old strategy: ${strategy.name}`);
      await retireStrategy(strategy.id, `Replaced by ${newStrategy.name}`);

      await log("info", "strategy_evolved_success", {
        old_strategy: strategy.name,
        new_strategy: newStrategy.name,
        new_strategy_id: newId,
        parent_id: strategy.id,
        old_pnl: strategy.performance?.total_pnl || 0,
      });

      results.evolved++;
      console.log(`      ✅ Evolution complete: ${strategy.name} → ${newStrategy.name}`);
    }
  } catch (error) {
    console.error("Evolution cycle error:", error);
    results.errors++;
  }

  console.log(`\n🧬 [EVOLUTION] Complete: ${results.evolved} evolved, ${results.errors} errors\n`);
  return results;
}

/**
 * Get evolution statistics
 */
export async function getEvolutionStats(): Promise<{
  totalEvolved: number;
  childrenOutperforming: number;
  averageImprovement: number;
}> {
  const supabase = getSupabase();

  // Get all evolved strategies and their children
  const { data: evolved } = await supabase
    .from("strategies")
    .select("id, name")
    .eq("status", "evolved");

  const { data: children } = await supabase
    .from("strategies")
    .select("id, name, parent_id")
    .not("parent_id", "is", null);

  // Get performance for comparison
  const { data: performances } = await supabase
    .from("strategy_performance")
    .select("strategy_id, total_pnl");

  const perfMap = new Map(performances?.map((p) => [p.strategy_id, p.total_pnl]) || []);

  let childrenOutperforming = 0;
  let totalImprovement = 0;
  let comparisons = 0;

  for (const child of children || []) {
    if (child.parent_id) {
      const childPnl = perfMap.get(child.id) || 0;
      const parentPnl = perfMap.get(child.parent_id) || 0;

      if (childPnl > parentPnl) {
        childrenOutperforming++;
      }
      totalImprovement += childPnl - parentPnl;
      comparisons++;
    }
  }

  return {
    totalEvolved: evolved?.length || 0,
    childrenOutperforming,
    averageImprovement: comparisons > 0 ? totalImprovement / comparisons : 0,
  };
}
