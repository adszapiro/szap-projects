/**
 * Reinforcement Learning Position Sizer
 *
 * Uses Q-learning to optimize position sizes based on:
 * - Current volatility
 * - Strategy win rate
 * - Portfolio heat (total exposure)
 * - Recent performance
 *
 * State: (volatility_bucket, win_rate_bucket, portfolio_heat_bucket, streak_bucket)
 * Action: position size multiplier (0.5x, 1.0x, 1.5x, 2.0x)
 * Reward: P&L from the trade
 */

import { getSupabase, log } from "../db.js";

// State discretization buckets
const VOLATILITY_BUCKETS = ["low", "medium", "high"] as const;
const WIN_RATE_BUCKETS = ["poor", "average", "good"] as const;
const HEAT_BUCKETS = ["cold", "warm", "hot"] as const;
const STREAK_BUCKETS = ["losing", "neutral", "winning"] as const;

type VolatilityBucket = typeof VOLATILITY_BUCKETS[number];
type WinRateBucket = typeof WIN_RATE_BUCKETS[number];
type HeatBucket = typeof HEAT_BUCKETS[number];
type StreakBucket = typeof STREAK_BUCKETS[number];

type State = `${VolatilityBucket}_${WinRateBucket}_${HeatBucket}_${StreakBucket}`;

// Actions are position size multipliers
const ACTIONS = [0.5, 1.0, 1.5, 2.0] as const;
type Action = typeof ACTIONS[number];

// Q-table stored in memory (persisted to DB periodically)
const qTable: Map<State, Map<Action, number>> = new Map();

// Learning parameters
const LEARNING_RATE = 0.1; // alpha
const DISCOUNT_FACTOR = 0.9; // gamma
const EXPLORATION_RATE = 0.15; // epsilon for epsilon-greedy

// Track the last state-action for updates
let lastStateAction: { state: State; action: Action; strategyId: string } | null = null;

/**
 * Discretize volatility into buckets
 * @param volatility - Annualized volatility percentage
 */
function getVolatilityBucket(volatility: number): VolatilityBucket {
  if (volatility < 20) return "low";
  if (volatility < 40) return "medium";
  return "high";
}

/**
 * Discretize win rate into buckets
 * @param winRate - 0-1 win rate
 */
function getWinRateBucket(winRate: number): WinRateBucket {
  if (winRate < 0.4) return "poor";
  if (winRate < 0.6) return "average";
  return "good";
}

/**
 * Discretize portfolio heat (exposure) into buckets
 * @param heat - 0-1 representing % of capital in positions
 */
function getHeatBucket(heat: number): HeatBucket {
  if (heat < 0.3) return "cold";
  if (heat < 0.6) return "warm";
  return "hot";
}

/**
 * Discretize recent streak into buckets
 * @param streak - Number of consecutive wins/losses (+ for wins, - for losses)
 */
function getStreakBucket(streak: number): StreakBucket {
  if (streak < -2) return "losing";
  if (streak > 2) return "winning";
  return "neutral";
}

/**
 * Build state from market and strategy conditions
 */
function buildState(
  volatility: number,
  winRate: number,
  portfolioHeat: number,
  streak: number
): State {
  return `${getVolatilityBucket(volatility)}_${getWinRateBucket(winRate)}_${getHeatBucket(portfolioHeat)}_${getStreakBucket(streak)}`;
}

/**
 * Initialize Q-values for a state if not exists
 */
function initializeState(state: State): void {
  if (!qTable.has(state)) {
    const actionValues = new Map<Action, number>();
    // Initialize with optimistic values to encourage exploration
    for (const action of ACTIONS) {
      actionValues.set(action, 0.5); // Optimistic initialization
    }
    qTable.set(state, actionValues);
  }
}

/**
 * Get Q-value for a state-action pair
 */
function getQValue(state: State, action: Action): number {
  initializeState(state);
  return qTable.get(state)!.get(action)!;
}

/**
 * Get maximum Q-value for a state
 */
function getMaxQ(state: State): number {
  initializeState(state);
  let maxQ = -Infinity;
  for (const action of ACTIONS) {
    const q = qTable.get(state)!.get(action)!;
    if (q > maxQ) maxQ = q;
  }
  return maxQ;
}

/**
 * Select action using epsilon-greedy policy
 */
function selectAction(state: State): Action {
  initializeState(state);

  // Explore
  if (Math.random() < EXPLORATION_RATE) {
    const randomIndex = Math.floor(Math.random() * ACTIONS.length);
    return ACTIONS[randomIndex];
  }

  // Exploit - choose best action
  let bestAction: Action = 1.0;
  let bestQ = -Infinity;

  for (const action of ACTIONS) {
    const q = getQValue(state, action);
    if (q > bestQ) {
      bestQ = q;
      bestAction = action;
    }
  }

  return bestAction;
}

/**
 * Update Q-value after trade result
 */
function updateQ(
  state: State,
  action: Action,
  reward: number,
  nextState: State | null
): void {
  initializeState(state);

  const oldQ = getQValue(state, action);
  const maxNextQ = nextState ? getMaxQ(nextState) : 0;

  // Q-learning update: Q(s,a) = Q(s,a) + α * (r + γ * max(Q(s',a')) - Q(s,a))
  const newQ = oldQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - oldQ);

  qTable.get(state)!.set(action, newQ);
}

/**
 * Calculate volatility from price array
 */
export function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 20; // Default medium volatility

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;

  return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
}

/**
 * Get recommended position size multiplier
 *
 * @param strategyId - Strategy ID
 * @param baseSize - Base position size (before multiplier)
 * @param volatility - Current volatility
 * @param winRate - Strategy win rate (0-1)
 * @param portfolioHeat - Current portfolio heat (0-1)
 * @param streak - Recent streak (+ for wins, - for losses)
 * @returns Position size multiplier
 */
export function getPositionSizeMultiplier(
  strategyId: string,
  volatility: number,
  winRate: number,
  portfolioHeat: number,
  streak: number
): number {
  const state = buildState(volatility, winRate, portfolioHeat, streak);
  const action = selectAction(state);

  // Store for later update
  lastStateAction = { state, action, strategyId };

  console.log(`🎲 [RL] State: ${state}, Action: ${action}x multiplier`);

  return action;
}

/**
 * Update the model after a trade completes
 *
 * @param strategyId - Strategy ID
 * @param pnl - P&L from the trade
 * @param newVolatility - New volatility after trade
 * @param newWinRate - New win rate after trade
 * @param newHeat - New portfolio heat after trade
 * @param newStreak - New streak after trade
 */
export function updateAfterTrade(
  strategyId: string,
  pnl: number,
  newVolatility: number,
  newWinRate: number,
  newHeat: number,
  newStreak: number
): void {
  if (!lastStateAction || lastStateAction.strategyId !== strategyId) {
    console.log("⚠️ [RL] No previous state-action to update");
    return;
  }

  const { state, action } = lastStateAction;
  const nextState = buildState(newVolatility, newWinRate, newHeat, newStreak);

  // Normalize reward (P&L as percentage, capped)
  const reward = Math.max(-1, Math.min(1, pnl / 100));

  updateQ(state, action, reward, nextState);

  console.log(`🎓 [RL] Updated Q(${state}, ${action}) with reward ${reward.toFixed(3)}`);

  lastStateAction = null;
}

/**
 * Get statistics about the Q-table
 */
export function getRLStats(): {
  totalStates: number;
  bestActions: Map<State, { action: Action; qValue: number }>;
} {
  const bestActions = new Map<State, { action: Action; qValue: number }>();

  for (const [state, actionValues] of qTable.entries()) {
    let bestAction: Action = 1.0;
    let bestQ = -Infinity;

    for (const [action, q] of actionValues.entries()) {
      if (q > bestQ) {
        bestQ = q;
        bestAction = action;
      }
    }

    bestActions.set(state, { action: bestAction, qValue: bestQ });
  }

  return {
    totalStates: qTable.size,
    bestActions,
  };
}

/**
 * Save Q-table to database for persistence
 */
export async function persistQTable(): Promise<void> {
  const supabase = getSupabase();

  const qData = Array.from(qTable.entries()).map(([state, actionValues]) => ({
    state,
    actions: Object.fromEntries(actionValues),
  }));

  const { error } = await supabase
    .from("rl_qtable")
    .upsert(
      { id: "position_sizer", q_data: qData, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) {
    console.error("Failed to persist Q-table:", error);
  } else {
    console.log(`💾 [RL] Persisted Q-table with ${qTable.size} states`);
  }
}

/**
 * Load Q-table from database
 */
export async function loadQTable(): Promise<void> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("rl_qtable")
    .select("q_data")
    .eq("id", "position_sizer")
    .single();

  if (error || !data) {
    console.log("🆕 [RL] No existing Q-table found, starting fresh");
    return;
  }

  qTable.clear();

  for (const { state, actions } of data.q_data) {
    const actionMap = new Map<Action, number>();
    for (const [action, value] of Object.entries(actions)) {
      actionMap.set(parseFloat(action) as Action, value as number);
    }
    qTable.set(state as State, actionMap);
  }

  console.log(`📂 [RL] Loaded Q-table with ${qTable.size} states`);
}

/**
 * Print current policy (best actions per state)
 */
export function printPolicy(): void {
  console.log("\n📋 [RL] Current Policy:");

  const stats = getRLStats();

  for (const [state, best] of stats.bestActions.entries()) {
    console.log(`   ${state}: ${best.action}x (Q=${best.qValue.toFixed(3)})`);
  }

  console.log(`\n   Total states learned: ${stats.totalStates}`);
}
