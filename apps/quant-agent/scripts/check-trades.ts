import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

async function check() {
  // Get strategies with 0 trades
  const { data: perf } = await supabase
    .from('strategy_performance')
    .select('strategy_id, total_trades')
    .eq('total_trades', 0);

  console.log('Strategies with 0 trades:', perf?.length);

  // Get total strategies
  const { data: strats } = await supabase
    .from('strategies')
    .select('id, name, asset_class')
    .eq('status', 'deployed');

  console.log('Total deployed strategies:', strats?.length);

  // Count by asset class
  const crypto = strats?.filter(s => s.asset_class === 'crypto').length;
  const stock = strats?.filter(s => s.asset_class === 'stock').length;
  console.log('Crypto:', crypto, 'Stock:', stock);

  // Get strategies with trades
  const { data: withTrades } = await supabase
    .from('strategy_performance')
    .select('strategy_id, total_trades')
    .gt('total_trades', 0);

  console.log('\nStrategies WITH trades:', withTrades?.length);
  if (withTrades) {
    const total = withTrades.reduce((sum, s) => sum + s.total_trades, 0);
    console.log('Total trades across all:', total);

    // Show distribution
    const sorted = withTrades.sort((a, b) => b.total_trades - a.total_trades);
    console.log('\nTop 5 by trades:');
    sorted.slice(0, 5).forEach(s => console.log(`  ${s.total_trades} trades`));
    console.log('\nBottom 5 by trades (non-zero):');
    sorted.slice(-5).forEach(s => console.log(`  ${s.total_trades} trades`));
  }
}

check().catch(console.error);
