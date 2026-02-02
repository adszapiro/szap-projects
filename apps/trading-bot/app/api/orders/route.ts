import { NextRequest, NextResponse } from "next/server";
import { getOrders, createOrder, cancelOrder, cancelAllOrders, AlpacaCredentials, OrderRequest } from "@/lib/alpaca";
import { validateSymbol, validateQuantity, validateSide, validateOrderType, validatePrice, sanitizeSymbol } from "@/lib/validation";

function getCredentials(): AlpacaCredentials | null {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const paper = process.env.ALPACA_PAPER !== "false";

  if (!apiKey || !secretKey) {
    return null;
  }

  return { apiKey, secretKey, paper };
}

export async function GET(request: NextRequest) {
  try {
    const credentials = getCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: "Not configured" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status") as "open" | "closed" | "all" || "open";
    const orders = await getOrders(credentials, status);

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        symbol: o.symbol,
        qty: parseFloat(String(o.qty)),
        filledQty: parseFloat(String(o.filled_qty)),
        side: o.side,
        type: o.type,
        timeInForce: o.time_in_force,
        limitPrice: o.limit_price ? parseFloat(String(o.limit_price)) : null,
        stopPrice: o.stop_price ? parseFloat(String(o.stop_price)) : null,
        filledAvgPrice: o.filled_avg_price ? parseFloat(String(o.filled_avg_price)) : null,
        status: o.status,
        createdAt: o.created_at,
        filledAt: o.filled_at,
      })),
    });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const credentials = getCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: "Not configured" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate all inputs
    const symbolValidation = validateSymbol(body.symbol);
    if (!symbolValidation.valid) {
      return NextResponse.json({ error: symbolValidation.error }, { status: 400 });
    }

    const qtyValidation = validateQuantity(body.qty);
    if (!qtyValidation.valid) {
      return NextResponse.json({ error: qtyValidation.error }, { status: 400 });
    }

    const sideValidation = validateSide(body.side);
    if (!sideValidation.valid) {
      return NextResponse.json({ error: sideValidation.error }, { status: 400 });
    }

    const typeValidation = validateOrderType(body.type);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.error }, { status: 400 });
    }

    // Validate limit price for limit orders
    const requiresLimitPrice = body.type === "limit" || body.type === "stop_limit";
    const limitPriceValidation = validatePrice(body.limitPrice, requiresLimitPrice);
    if (!limitPriceValidation.valid) {
      return NextResponse.json({ error: limitPriceValidation.error }, { status: 400 });
    }

    // Validate stop price for stop orders
    const requiresStopPrice = body.type === "stop" || body.type === "stop_limit";
    const stopPriceValidation = validatePrice(body.stopPrice, requiresStopPrice);
    if (!stopPriceValidation.valid) {
      return NextResponse.json({ error: stopPriceValidation.error }, { status: 400 });
    }

    const orderRequest: OrderRequest = {
      symbol: sanitizeSymbol(body.symbol),
      qty: Number(body.qty),
      side: body.side.toLowerCase(),
      type: body.type.toLowerCase(),
      time_in_force: body.timeInForce || "day",
      limit_price: body.limitPrice ? Number(body.limitPrice) : undefined,
      stop_price: body.stopPrice ? Number(body.stopPrice) : undefined,
    };

    const order = await createOrder(credentials, orderRequest);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        symbol: order.symbol,
        qty: parseFloat(String(order.qty)),
        side: order.side,
        type: order.type,
        status: order.status,
        createdAt: order.created_at,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order", message: String(error) },
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
    const orderId = searchParams.get("id");

    if (orderId) {
      await cancelOrder(credentials, orderId);
      return NextResponse.json({ success: true, cancelled: orderId });
    } else {
      await cancelAllOrders(credentials);
      return NextResponse.json({ success: true, message: "All orders cancelled" });
    }
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      { error: "Failed to cancel order(s)" },
      { status: 500 }
    );
  }
}
