import { config } from 'dotenv';
config({ path: '.env.local' });
import { getBars, getCryptoBars } from '../src/executor.js';

async function main() {
  console.log("Testing getBars for SPY...");
  const bars = await getBars("SPY", 100);
  console.log("Stock bars returned:", bars?.length || 0);
  if (bars && bars.length > 0) {
    console.log("First bar:", bars[0]);
    console.log("Last bar:", bars[bars.length - 1]);
  }
  
  console.log("\nTesting getCryptoBars for BTC/USD...");
  const cryptoBars = await getCryptoBars("BTC/USD", 50);
  console.log("Crypto bars returned:", cryptoBars?.length || 0);
  if (cryptoBars && cryptoBars.length > 0) {
    console.log("First bar:", cryptoBars[0]);
    console.log("Last bar:", cryptoBars[cryptoBars.length - 1]);
  }
}
main().catch(console.error);
