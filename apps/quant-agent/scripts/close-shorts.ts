import { config } from 'dotenv';
config({ path: '.env.local' });
import { getPositions, placeOrder } from '../src/executor.js';

async function main() {
  console.log("📊 Closing short positions...\n");
  
  const positions = await getPositions();
  
  for (const p of positions) {
    const qty = parseFloat(p.qty);
    if (qty < 0) {
      // Short position - need to BUY to close
      const buyQty = Math.abs(qty);
      console.log(`🔄 Closing short: ${p.symbol} (${qty} -> 0)`);
      try {
        await placeOrder({
          symbol: p.symbol,
          qty: buyQty,
          side: "buy",
          reasoning: "Close short position",
        });
        console.log(`   ✅ Closed ${p.symbol} short`);
      } catch (error) {
        console.error(`   ❌ Failed to close ${p.symbol}: ${error}`);
      }
    }
  }
  
  console.log("\n✅ Done!");
}
main().catch(console.error);
