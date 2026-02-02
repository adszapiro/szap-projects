import { NextRequest, NextResponse } from "next/server";
import { createOrder, getAccount, getLatestTrade, AlpacaCredentials } from "@/lib/alpaca";
import { validateSymbol, validateSide, validateOrderType, validatePercentage, validateDollarAmount, sanitizeSymbol } from "@/lib/validation";

function getCredentials(): AlpacaCredentials | null {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const paper = process.env.ALPACA_PAPER !== "false";

  if (!apiKey || !secretKey) {
    return null;
  }

  return { apiKey, secretKey, paper };
}

// Quick trade endpoint for strategy execution
export async function POST(request: NextRequest) {
  try {
    const credentials = getCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: "Not configured" }, { status: 401 });
    }

    const body = await request.json();
    const { symbol, side, percentOfPortfolio, dollarAmount, type = "market" } = body;

    // Validate all inputs
    const symbolValidation = validateSymbol(symbol);
    if (!symbolValidation.valid) {
      return NextResponse.json({ error: symbolValidation.error }, { status: 400 });
    }

    const sideValidation = validateSide(side);
    if (!sideValidation.valid) {
      return NextResponse.json({ error: sideValidation.error }, { status: 400 });
    }

    const typeValidation = validateOrderType(type);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.error }, { status: 400 });
    }

    const percentValidation = validatePercentage(percentOfPortfolio);
    if (!percentValidation.valid) {
      return NextResponse.json({ error: percentValidation.error }, { status: 400 });
    }

    const dollarValidation = validateDollarAmount(dollarAmount);
    if (!dollarValidation.valid) {
      return NextResponse.json({ error: dollarValidation.error }, { status: 400 });
    }

    if (!percentOfPortfolio && !dollarAmount) {
      return NextResponse.json(
        { error: "Must provide either percentOfPortfolio or dollarAmount" },
        { status: 400 }
      );
    }

    const sanitizedSymbol = sanitizeSymbol(symbol);

    // Get account and current price to calculate quantity
    const [account, latestTrade] = await Promise.all([
      getAccount(credentials),
      getLatestTrade(credentials, sanitizedSymbol),
    ]);

    const portfolioValue = parseFloat(String(account.portfolio_value));
    const currentPrice = latestTrade.trade.p;

    // Calculate dollar amount
    let tradeAmount: number;
    if (dollarAmount) {
      tradeAmount = dollarAmount;
    } else if (percentOfPortfolio) {
      tradeAmount = (portfolioValue * percentOfPortfolio) / 100;
    } else {
      return NextResponse.json(
        { error: "Must provide either percentOfPortfolio or dollarAmount" },
        { status: 400 }
      );
    }

    // Calculate quantity (whole shares only for non-fractional)
    const qty = Math.floor(tradeAmount / currentPrice);

    if (qty < 1) {
      return NextResponse.json(
        { error: "Calculated quantity is less than 1 share", tradeAmount, currentPrice },
        { status: 400 }
      );
    }

    // Create the order
    const order = await createOrder(credentials, {
      symbol: sanitizedSymbol,
      qty,
      side: side.toLowerCase(),
      type: type.toLowerCase(),
      time_in_force: "day",
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        qty: parseFloat(String(order.qty)),
        side: order.side,
        type: order.type,
        status: order.status,
        estimatedValue: qty * currentPrice,
        currentPrice,
      },
    });
  } catch (error) {
    console.error("Quick trade error:", error);
    return NextResponse.json(
      { error: "Failed to execute trade", message: String(error) },
      { status: 500 }
    );
  }
}
