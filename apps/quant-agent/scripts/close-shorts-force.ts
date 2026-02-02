import { config } from 'dotenv';
config({ path: '.env.local' });

const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";
const apiKey = process.env.ALPACA_API_KEY!;
const secretKey = process.env.ALPACA_SECRET_KEY!;

async function alpacaRequest(endpoint: string, body?: any) {
  const response = await fetch(`${ALPACA_PAPER_URL}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": secretKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

async function main() {
  console.log("📊 Force closing short positions...\n");
  
  const positions = await alpacaRequest("/v2/positions");
  
  for (const p of positions) {
    const qty = parseFloat(p.qty);
    if (qty < 0) {
      const buyQty = Math.abs(qty);
      console.log(`🔄 Closing short: ${p.symbol} (${qty} -> 0)`);
      try {
        const result = await alpacaRequest("/v2/orders", {
          symbol: p.symbol,
          qty: buyQty.toString(),
          side: "buy",
          type: "market",
          time_in_force: "day",
        });
        if (result.id) {
          console.log(`   ✅ Order placed: ${result.id}`);
        } else {
          console.log(`   ❌ Error: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed: ${error}`);
      }
    }
  }
  
  console.log("\n✅ Done!");
}
main().catch(console.error);
