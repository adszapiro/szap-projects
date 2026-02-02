/**
 * Fix Performance Data
 * Backfills strategy_performance from existing trades
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { getAccount } from '../src/executor.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
  console.log("🔧 FIXING PERFORMANCE DATA\n");
  
  // 1. Get all trades with strategy_id
  const { data: trades } = await supabase
    .from('agent_trades')
    .select('*')
    .not('strategy_id', 'is', null)
    .order('created_at', { ascending: true });
  
  console.log(`📊 Found ${trades?.length || 0} trades with strategy_id\n`);
  
  // 2. Group trades by strategy
  const strategyTrades = new Map<string, any[]>();
  for (const trade of trades || []) {
    const list = strategyTrades.get(trade.strategy_id) || [];
    list.push(trade);
    strategyTrades.set(trade.strategy_id, list);
  }
  
  // 3. Calculate performance for each strategy
  for (const [strategyId, trades] of strategyTrades) {
    const totalTrades = trades.length;
    const sellTrades = trades.filter(t => t.side === 'sell');
    const winningTrades = sellTrades.filter(t => (t.pnl || 0) > 0).length;
    const totalPnl = sellTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    // Thompson Sampling: alpha = wins + 1, beta = losses + 1
    const wins = winningTrades;
    const losses = sellTrades.length - winningTrades;
    
    console.log(`  Strategy ${strategyId.slice(0,8)}...: ${totalTrades} trades, ${wins}W/${losses}L, P&L: $${totalPnl.toFixed(2)}`);
    
    // Update strategy_performance
    const { error } = await supabase
      .from('strategy_performance')
      .upsert({
        strategy_id: strategyId,
        alpha: wins + 1,
        beta: losses + 1,
        total_trades: totalTrades,
        winning_trades: winningTrades,
        total_pnl: totalPnl,
        current_weight: 1 / strategyTrades.size, // Equal weight for now
        updated_at: new Date().toISOString(),
      }, { onConflict: 'strategy_id' });
    
    if (error) {
      console.error(`    ❌ Error: ${error.message}`);
    }
  }
  
  // 4. Create daily snapshot for today
  console.log("\n📅 Creating daily snapshot...");
  
  const account = await getAccount();
  const todaysTrades = trades?.filter(t => {
    const tradeDate = new Date(t.created_at).toDateString();
    return tradeDate === new Date().toDateString();
  }) || [];
  
  const todaysPnl = todaysTrades
    .filter(t => t.side === 'sell')
    .reduce((sum, t) => sum + (t.pnl || 0), 0);
  
  const winningToday = todaysTrades.filter(t => t.side === 'sell' && (t.pnl || 0) > 0).length;
  const sellsToday = todaysTrades.filter(t => t.side === 'sell').length;
  
  const snapshot = {
    date: new Date().toISOString().split('T')[0],
    portfolio_value: parseFloat(account.portfolio_value),
    cash_balance: parseFloat(account.cash),
    daily_pnl: todaysPnl,
    daily_pnl_percent: (todaysPnl / parseFloat(account.last_equity || account.portfolio_value)) * 100,
    total_pnl: parseFloat(account.equity) - 100000,
    total_pnl_percent: ((parseFloat(account.equity) - 100000) / 100000) * 100,
    active_strategies: strategyTrades.size,
    trades_today: todaysTrades.length,
    win_rate_today: sellsToday > 0 ? winningToday / sellsToday : 0.5,
  };
  
  const { error: snapError } = await supabase
    .from('daily_snapshots')
    .upsert(snapshot, { onConflict: 'date' });
  
  if (snapError) {
    console.error(`  ❌ Snapshot error: ${snapError.message}`);
  } else {
    console.log(`  ✅ Snapshot saved: $${snapshot.portfolio_value.toFixed(2)}`);
  }
  
  console.log("\n✅ Performance data fixed!");
}

main().catch(console.error);
