import { saveTrade, updateTrade, log } from "./db.js";

const ALPACA_BASE_URL = process.env.ALPACA_PAPER === "true"
  ? "https://paper-api.alpaca.markets"
  : "https://api.alpaca.markets";

const ALPACA_DATA_URL = "https://data.alpaca.markets";

interface AlpacaCredentials {
  apiKey: string;
  secretKey: string;
}

function getCredentials(): AlpacaCredentials {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("Alpaca credentials not configured");
  }

  return { apiKey, secretKey };
}

async function alpacaRequest<T>(
  endpoint: string,
  options: { method?: string; body?: unknown; isData?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, isData = false } = options;
  const { apiKey, secretKey } = getCredentials();
  const baseUrl = isData ? ALPACA_DATA_URL : ALPACA_BASE_URL;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": secretKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Alpaca API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Account
export async function getAccount(): Promise<{
  portfolio_value: number;
  cash: number;
  equity: number;
  buying_power: number;
  last_equity: number;
}> {
  const account = await alpacaRequest<any>("/v2/account");
  return {
    portfolio_value: parseFloat(account.portfolio_value),
    cash: parseFloat(account.cash),
    equity: parseFloat(account.equity),
    buying_power: parseFloat(account.buying_power),
    last_equity: parseFloat(account.last_equity),
  };
}

// Positions
export async function getPositions(): Promise<any[]> {
  return alpacaRequest<any[]>("/v2/positions");
}

export async function getPosition(symbol: string): Promise<any | null> {
  try {
    return await alpacaRequest<any>(`/v2/positions/${symbol}`);
  } catch {
    return null;
  }
}

// Orders
export async function placeOrder(params: {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type?: "market" | "limit";
  time_in_force?: "day" | "gtc";
  limit_price?: number;
  strategy_id?: string;
  reasoning?: string;
}): Promise<{ orderId: string; tradeId: string }> {
  const { symbol, qty, side, type = "market", time_in_force = "day", limit_price, strategy_id, reasoning } = params;

  // Check guardrails
  const account = await getAccount();
  const maxPositionValue = account.portfolio_value * (parseFloat(process.env.AGENT_MAX_POSITION_PERCENT || "20") / 100);
  
  // Get current price
  const latestTrade = await alpacaRequest<any>(`/v2/stocks/${symbol}/trades/latest`, { isData: true });
  const price = latestTrade.trade.p;
  const orderValue = qty * price;

  if (orderValue > maxPositionValue) {
    await log("warning", "order_rejected", { reason: "exceeds_max_position", symbol, orderValue, maxPositionValue });
    throw new Error(`Order value $${orderValue} exceeds max position $${maxPositionValue}`);
  }

  // Check daily trade limit
  const maxDailyTrades = parseInt(process.env.AGENT_MAX_DAILY_TRADES || "10");
  // TODO: Check today's trade count from DB

  // Place order
  const order = await alpacaRequest<any>("/v2/orders", {
    method: "POST",
    body: {
      symbol,
      qty: qty.toString(),
      side,
      type,
      time_in_force,
      limit_price: limit_price?.toString(),
    },
  });

  // Log to DB
  const tradeId = await saveTrade({
    strategy_id,
    symbol,
    side,
    qty,
    price,
    order_id: order.id,
    reasoning,
  });

  await log("decision", "order_placed", {
    symbol,
    side,
    qty,
    price,
    order_id: order.id,
    trade_id: tradeId,
    reasoning,
  });

  return { orderId: order.id, tradeId };
}

export async function cancelOrder(orderId: string): Promise<void> {
  await alpacaRequest(`/v2/orders/${orderId}`, { method: "DELETE" });
  await log("info", "order_cancelled", { order_id: orderId });
}

export async function getOrders(status: "open" | "closed" | "all" = "open"): Promise<any[]> {
  return alpacaRequest<any[]>(`/v2/orders?status=${status}`);
}

// Market Data
export async function getBars(
  symbol: string,
  timeframe: string = "1Day",
  limit: number = 100
): Promise<{ close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] }> {
  const response = await alpacaRequest<any>(
    `/v2/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}`,
    { isData: true }
  );

  const bars = response.bars || [];
  return {
    close: bars.map((b: any) => b.c),
    high: bars.map((b: any) => b.h),
    low: bars.map((b: any) => b.l),
    open: bars.map((b: any) => b.o),
    volume: bars.map((b: any) => b.v),
  };
}

export async function getLatestPrice(symbol: string): Promise<number> {
  const response = await alpacaRequest<any>(`/v2/stocks/${symbol}/trades/latest`, { isData: true });
  return response.trade.p;
}

// Market Status
export async function isMarketOpen(): Promise<boolean> {
  const clock = await alpacaRequest<any>("/v2/clock");
  return clock.is_open;
}

// Close position
export async function closePosition(symbol: string): Promise<void> {
  await alpacaRequest(`/v2/positions/${symbol}`, { method: "DELETE" });
  await log("decision", "position_closed", { symbol });
}

// Calculate position size based on portfolio percentage
export async function calculatePositionSize(
  symbol: string,
  percentOfPortfolio: number
): Promise<number> {
  const account = await getAccount();
  const price = await getLatestPrice(symbol);
  const targetValue = account.portfolio_value * (percentOfPortfolio / 100);
  return Math.floor(targetValue / price);
}
