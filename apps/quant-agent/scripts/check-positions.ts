import { config } from 'dotenv';
config({ path: '.env.local' });
import { getPositions, getAccount } from '../src/executor.js';

async function main() {
  console.log("📊 Alpaca Account Status:");
  const account = await getAccount();
  console.log(`   Portfolio Value: $${account.portfolio_value}`);
  console.log(`   Cash: $${account.cash}`);
  console.log(`   Buying Power: $${account.buying_power}`);
  
  console.log("\n📈 Current Positions:");
  const positions = await getPositions();
  if (positions.length === 0) {
    console.log("   No positions");
  } else {
    for (const p of positions) {
      console.log(`   ${p.symbol}: ${p.qty} shares @ $${parseFloat(p.avg_entry_price).toFixed(2)} (P&L: $${parseFloat(p.unrealized_pl).toFixed(2)})`);
    }
  }
}
main().catch(console.error);
