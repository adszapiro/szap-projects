/**
 * Backfill daily snapshots from trade history
 * Creates one snapshot per day based on cumulative P&L
 */

import { config } from "dotenv";
import { join } from "path";
config({ path: join(process.cwd(), ".env.local"), override: true });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

const STARTING_CAPITAL = 150000; // 100k real + 50k simulated

async function backfill() {
  console.log("📊 Backfilling daily snapshots from trade history...\n");

  // Get all trades with P&L
  const { data: trades, error } = await supabase
    .from("agent_trades")
    .select("created_at, pnl, side")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching trades:", error);
    return;
  }

  if (!trades || trades.length === 0) {
    console.log("No trades found");
    return;
  }

  console.log(`Found ${trades.length} trades\n`);

  // Group trades by date
  const tradesByDate = new Map<string, { trades: number; pnl: number; wins: number }>();

  for (const trade of trades) {
    const date = trade.created_at.split("T")[0];
    const existing = tradesByDate.get(date) || { trades: 0, pnl: 0, wins: 0 };

    existing.trades++;
    if (trade.pnl) {
      existing.pnl += trade.pnl;
      if (trade.pnl > 0) existing.wins++;
    }

    tradesByDate.set(date, existing);
  }

  console.log(`Trading days: ${tradesByDate.size}\n`);

  // Calculate cumulative P&L for each day and create snapshots
  let cumulativePnl = 0;
  const snapshots: Array<{
    date: string;
    portfolio_value: number;
    daily_pnl: number;
    daily_pnl_percent: number;
    total_pnl: number;
    total_pnl_percent: number;
    active_strategies: number;
    trades_today: number;
    win_rate_today: number;
  }> = [];

  // Get strategy count
  const { data: strategies } = await supabase
    .from("strategies")
    .select("id")
    .eq("status", "deployed");
  const strategyCount = strategies?.length || 64;

  // Sort dates
  const sortedDates = Array.from(tradesByDate.keys()).sort();

  for (const date of sortedDates) {
    const dayData = tradesByDate.get(date)!;
    cumulativePnl += dayData.pnl;

    const portfolioValue = STARTING_CAPITAL + cumulativePnl;
    const prevValue = STARTING_CAPITAL + (cumulativePnl - dayData.pnl);

    snapshots.push({
      date,
      portfolio_value: portfolioValue,
      daily_pnl: dayData.pnl,
      daily_pnl_percent: prevValue > 0 ? (dayData.pnl / prevValue) * 100 : 0,
      total_pnl: cumulativePnl,
      total_pnl_percent: (cumulativePnl / STARTING_CAPITAL) * 100,
      active_strategies: strategyCount,
      trades_today: dayData.trades,
      win_rate_today: dayData.trades > 0 ? dayData.wins / dayData.trades : 0,
    });

    console.log(`${date}: $${portfolioValue.toFixed(2)} (day: ${dayData.pnl >= 0 ? '+' : ''}$${dayData.pnl.toFixed(2)}, ${dayData.trades} trades)`);
  }

  // Upsert all snapshots
  console.log(`\n💾 Saving ${snapshots.length} snapshots...`);

  for (const snapshot of snapshots) {
    const { error: upsertError } = await supabase
      .from("daily_snapshots")
      .upsert(snapshot, { onConflict: "date" });

    if (upsertError) {
      console.error(`Failed to save ${snapshot.date}:`, upsertError.message);
    }
  }

  console.log("\n✅ Backfill complete!");

  // Verify
  const { data: finalSnapshots } = await supabase
    .from("daily_snapshots")
    .select("date, portfolio_value")
    .order("date", { ascending: false })
    .limit(10);

  console.log("\nRecent snapshots:");
  finalSnapshots?.forEach(s => console.log(`  ${s.date}: $${s.portfolio_value}`));
}

backfill().catch(console.error);
