import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
  console.log("🔍 DASHBOARD DATA AUDIT\n");
  
  // 1. Check agent_trades
  const { data: trades, count: tradeCount } = await supabase
    .from('agent_trades')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log(`📊 agent_trades: ${tradeCount} total`);
  if (trades && trades.length > 0) {
    console.log("   Recent trades:");
    for (const t of trades) {
      console.log(`   - ${t.symbol} ${t.side} ${t.qty} @ $${t.price} (strategy: ${t.strategy_id?.slice(0,8) || 'none'})`);
    }
  }
  
  // 2. Check strategy_performance
  const { data: perfData, count: perfCount } = await supabase
    .from('strategy_performance')
    .select('*', { count: 'exact' })
    .limit(5);
  
  console.log(`\n📈 strategy_performance: ${perfCount} records`);
  if (perfData && perfData.length > 0) {
    for (const p of perfData) {
      console.log(`   - wins=${p.wins}, losses=${p.losses}, total_pnl=${p.total_pnl}`);
    }
  }
  
  // 3. Check strategies with trade counts
  const { data: strategies } = await supabase
    .from('strategies')
    .select('id, name, status')
    .eq('status', 'deployed')
    .limit(5);
  
  console.log(`\n📋 strategies (deployed): checking trade linkage...`);
  if (strategies) {
    for (const s of strategies) {
      const { count } = await supabase
        .from('agent_trades')
        .select('*', { count: 'exact', head: true })
        .eq('strategy_id', s.id);
      console.log(`   - "${s.name}": ${count || 0} trades linked`);
    }
  }
  
  // 4. Check if trades have strategy_id
  const { data: tradesWithStrategy } = await supabase
    .from('agent_trades')
    .select('strategy_id')
    .not('strategy_id', 'is', null)
    .limit(1);
  
  const { count: tradesWithoutStrategy } = await supabase
    .from('agent_trades')
    .select('*', { count: 'exact', head: true })
    .is('strategy_id', null);
  
  console.log(`\n⚠️ Trades without strategy_id: ${tradesWithoutStrategy}`);
  console.log(`   Trades with strategy_id: ${(tradeCount || 0) - (tradesWithoutStrategy || 0)}`);
  
  // 5. Check daily_snapshots
  const { data: snapshots, count: snapCount } = await supabase
    .from('daily_snapshots')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .limit(3);
  
  console.log(`\n📅 daily_snapshots: ${snapCount} records`);
  if (snapshots) {
    for (const s of snapshots) {
      console.log(`   - ${s.date}: portfolio=$${s.portfolio_value}, cash=$${s.cash_balance}`);
    }
  }
}

main().catch(console.error);
