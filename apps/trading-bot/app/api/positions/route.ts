import { NextResponse } from "next/server";
import { getPositions, closePosition, closeAllPositions, AlpacaCredentials } from "@/lib/alpaca";

function getCredentials(): AlpacaCredentials | null {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const paper = process.env.ALPACA_PAPER !== "false";

  if (!apiKey || !secretKey) {
    return null;
  }

  return { apiKey, secretKey, paper };
}

export async function GET() {
  try {
    const credentials = getCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: "Not configured" }, { status: 401 });
    }

    const positions = await getPositions(credentials);

    return NextResponse.json({
      positions: positions.map((p) => ({
        symbol: p.symbol,
        qty: parseFloat(String(p.qty)),
        side: p.side,
        avgEntryPrice: parseFloat(String(p.avg_entry_price)),
        currentPrice: parseFloat(String(p.current_price)),
        marketValue: parseFloat(String(p.market_value)),
        costBasis: parseFloat(String(p.cost_basis)),
        unrealizedPl: parseFloat(String(p.unrealized_pl)),
        unrealizedPlPercent: parseFloat(String(p.unrealized_plpc)) * 100,
        changeToday: parseFloat(String(p.change_today)) * 100,
      })),
    });
  } catch (error) {
    console.error("Positions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const credentials = getCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: "Not configured" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (symbol) {
      // Close specific position
      const order = await closePosition(credentials, symbol);
      return NextResponse.json({ success: true, order });
    } else {
      // Close all positions
      const orders = await closeAllPositions(credentials);
      return NextResponse.json({ success: true, orders });
    }
  } catch (error) {
    console.error("Close position error:", error);
    return NextResponse.json(
      { error: "Failed to close position(s)" },
      { status: 500 }
    );
  }
}
