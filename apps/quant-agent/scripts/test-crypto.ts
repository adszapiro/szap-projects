import { config } from 'dotenv';
config({ path: '.env.local' });
import { getCryptoBars } from '../src/executor.js';

async function main() {
  console.log("Testing Alpaca crypto data...\n");
  
  for (const symbol of ["BTC/USD", "ETH/USD", "SOL/USD"]) {
    console.log(`Testing ${symbol}...`);
    try {
      const bars = await getCryptoBars(symbol, "1Day", 30);
      console.log(`  ✅ Got ${bars.close?.length || 0} bars`);
      if (bars.close?.length > 0) {
        console.log(`  Last price: $${bars.close[bars.close.length - 1]}`);
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}
main().catch(console.error);
