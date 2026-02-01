import { saveTrade, updateTrade, log } from "./db.js";

const ALPACA_BASE_URL = process.env.ALPACA_PAPER === "true"
  ? "https://paper-api.alpaca.markets"
  : "https://api.alpaca.markets";

const ALPACA_DATA_URL = "https://data.alpaca.markets";
const ALPACA_CRYPTO_DATA_URL = "https://data.alpaca.markets/v1beta3/crypto/us";

// Check if symbol is crypto (contains /)
export function isCryptoSymbol(symbol: string): boolean {
  return symbol.includes("/");
}

// Convert crypto symbol for API (BTC/USD -> BTCUSD for some endpoints)
function formatCryptoSymbol(symbol: string): string {
  return symbol.replace("/", "");
}

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
    const positionSymbol = isCryptoSymbol(symbol) ? formatCryptoSymbol(symbol) : symbol;
    return await alpacaRequest<any>(`/v2/positions/${positionSymbol}`);
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
  time_in_force?: "day" | "gtc" | "ioc";
  limit_price?: number;
  strategy_id?: string;
  reasoning?: string;
}): Promise<{ orderId: string; tradeId: string }> {
  const isCrypto = isCryptoSymbol(params.symbol);
  const { 
    symbol, 
    qty, 
    side, 
    type = "market", 
    time_in_force = isCrypto ? "gtc" : "day",  // Crypto uses GTC
    limit_price, 
    strategy_id, 
    reasoning 
  } = params;

  // Check guardrails
  const account = await getAccount();
  const maxPositionValue = account.portfolio_value * (parseFloat(process.env.AGENT_MAX_POSITION_PERCENT || "20") / 100);
  
  // Get current price (handles both stocks and crypto)
  const price = await getLatestPrice(symbol);
  const orderValue = qty * price;

  if (orderValue > maxPositionValue) {
    await log("warning", "order_rejected", { reason: "exceeds_max_position", symbol, orderValue, maxPositionValue, asset_class: isCrypto ? "crypto" : "stock" });
    throw new Error(`Order value $${orderValue} exceeds max position $${maxPositionValue}`);
  }

  // Check daily trade limit
  const maxDailyTrades = parseInt(process.env.AGENT_MAX_DAILY_TRADES || "10");
  // TODO: Check today's trade count from DB

  // Place order - crypto symbols need to be formatted without /
  const orderSymbol = isCrypto ? formatCryptoSymbol(symbol) : symbol;
  
  // Build order body
  const orderBody: Record<string, string> = {
    symbol: orderSymbol,
    side,
    type,
    time_in_force,
  };

  // Crypto supports fractional, stocks need whole numbers
  if (isCrypto) {
    orderBody.qty = qty.toFixed(8);  // High precision for crypto
  } else {
    orderBody.qty = Math.floor(qty).toString();
  }

  if (limit_price) {
    orderBody.limit_price = limit_price.toString();
  }

  // Place order
  const order = await alpacaRequest<any>("/v2/orders", {
    method: "POST",
    body: orderBody,
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
  if (isCryptoSymbol(symbol)) {
    return getLatestCryptoPrice(symbol);
  }
  const response = await alpacaRequest<any>(`/v2/stocks/${symbol}/trades/latest`, { isData: true });
  return response.trade.p;
}

// =====================
// CRYPTO DATA FUNCTIONS
// =====================

// Get all available crypto assets from Alpaca
export async function getCryptoAssets(): Promise<string[]> {
  const assets = await alpacaRequest<any[]>("/v2/assets?asset_class=crypto&status=active");
  return assets.map((a: any) => a.symbol);
}

// Get crypto OHLCV bars
export async function getCryptoBars(
  symbol: string,
  timeframe: string = "1Day",
  limit: number = 100
): Promise<{ close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] }> {
  const formattedSymbol = formatCryptoSymbol(symbol);
  const { apiKey, secretKey } = getCredentials();
  
  const response = await fetch(
    `${ALPACA_CRYPTO_DATA_URL}/bars?symbols=${formattedSymbol}&timeframe=${timeframe}&limit=${limit}`,
    {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": secretKey,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Crypto API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const bars = data.bars?.[formattedSymbol] || [];
  
  return {
    close: bars.map((b: any) => b.c),
    high: bars.map((b: any) => b.h),
    low: bars.map((b: any) => b.l),
    open: bars.map((b: any) => b.o),
    volume: bars.map((b: any) => b.v),
  };
}

// Get latest crypto price
export async function getLatestCryptoPrice(symbol: string): Promise<number> {
  const formattedSymbol = formatCryptoSymbol(symbol);
  const { apiKey, secretKey } = getCredentials();
  
  const response = await fetch(
    `${ALPACA_CRYPTO_DATA_URL}/latest/trades?symbols=${formattedSymbol}`,
    {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": secretKey,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Crypto API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.trades?.[formattedSymbol]?.p || 0;
}

// Get bars (auto-detect stock vs crypto)
export async function getAssetBars(
  symbol: string,
  timeframe: string = "1Day",
  limit: number = 100
): Promise<{ close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] }> {
  if (isCryptoSymbol(symbol)) {
    return getCryptoBars(symbol, timeframe, limit);
  }
  return getBars(symbol, timeframe, limit);
}

// Market Status
export async function isMarketOpen(): Promise<boolean> {
  const clock = await alpacaRequest<any>("/v2/clock");
  return clock.is_open;
}

// Close position
export async function closePosition(symbol: string): Promise<void> {
  // Crypto symbols need to be formatted without /
  const positionSymbol = isCryptoSymbol(symbol) ? formatCryptoSymbol(symbol) : symbol;
  await alpacaRequest(`/v2/positions/${positionSymbol}`, { method: "DELETE" });
  await log("decision", "position_closed", { symbol, asset_class: isCryptoSymbol(symbol) ? "crypto" : "stock" });
}

// Calculate position size based on portfolio percentage
export async function calculatePositionSize(
  symbol: string,
  percentOfPortfolio: number
): Promise<number> {
  const account = await getAccount();
  const price = await getLatestPrice(symbol);
  const targetValue = account.portfolio_value * (percentOfPortfolio / 100);
  
  // Crypto allows fractional, stocks need whole numbers
  if (isCryptoSymbol(symbol)) {
    return targetValue / price;  // Fractional OK
  }
  return Math.floor(targetValue / price);
}
