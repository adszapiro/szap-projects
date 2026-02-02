import { config } from 'dotenv';
config({ path: '.env.local' });
import { getSimulatedAccountValue, getSimulatedPosition, placeSimulatedOrder } from '../src/simulator.js';

async function main() {
  console.log("Simulated Account Value:", getSimulatedAccountValue());
  console.log("UNI Position:", getSimulatedPosition("UNI/USD"));
  
  // Try placing a simulated order
  console.log("\nPlacing simulated BUY order for UNI/USD...");
  const result = await placeSimulatedOrder("UNI/USD", "buy", 10, 7.5, "test-strategy", "Test order");
  console.log("Order result:", result);
  
  console.log("New UNI Position:", getSimulatedPosition("UNI/USD"));
}
main().catch(console.error);
