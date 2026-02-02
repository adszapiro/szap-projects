import { saveTrade, updateTrade, log } from "./db.js";

// Use a getter function to ensure env is loaded
function getAlpacaBaseUrl(): string {
  return process.env.ALPACA_PAPER === "true"
    ? "https://paper-api.alpaca.markets"
    : "https://api.alpaca.markets";
}

const ALPACA_DATA_URL = "https://data.alpaca.markets";
const ALPACA_CRYPTO_DATA_URL = "https://data.alpaca.markets/v1beta3/crypto/us";
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

// Map crypto symbols to CoinGecko IDs
const CRYPTO_ID_MAP: Record<string, string> = {
  "BTC/USD": "bitcoin",
  "ETH/USD": "ethereum",
  "SOL/USD": "solana",
  "DOGE/USD": "dogecoin",
  "AVAX/USD": "avalanche-2",
  "LINK/USD": "chainlink",
  "UNI/USD": "uniswap",
  "AAVE/USD": "aave",
  "LTC/USD": "litecoin",
  "BCH/USD": "bitcoin-cash",
  "DOT/USD": "polkadot",
  "MATIC/USD": "matic-network",
  "ATOM/USD": "cosmos",
  "XLM/USD": "stellar",
  "ALGO/USD": "algorand",
};

// Flag to track if Alpaca crypto is available
let alpacaCryptoAvailable: boolean | null = null;

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
  const baseUrl = isData ? ALPACA_DATA_URL : getAlpacaBaseUrl();
  
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
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
  // Calculate start date (go back enough days to get the requested limit)
  const daysBack = timeframe === "1Day" ? limit + 10 : Math.ceil(limit / 6.5) + 5; // Account for weekends/holidays
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startStr = startDate.toISOString().split("T")[0];
  
  const response = await alpacaRequest<any>(
    `/v2/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}&start=${startStr}`,
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

// Crypto bars cache to avoid repeated API calls
const cryptoBarsCache: Map<string, { data: any; timestamp: number }> = new Map();
const CRYPTO_BARS_CACHE_TTL = 60 * 1000; // 1 minute cache

// Get crypto OHLCV bars (tries Alpaca first, falls back to CoinGecko)
export async function getCryptoBars(
  symbol: string,
  timeframe: string = "1Day",
  limit: number = 100
): Promise<{ close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] }> {
  // Check cache first
  const cacheKey = `${symbol}-${timeframe}-${limit}`;
  const cached = cryptoBarsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CRYPTO_BARS_CACHE_TTL) {
    return cached.data;
  }

  // Always try Alpaca first - they support major crypto pairs
  const formattedSymbol = formatCryptoSymbol(symbol);
  const { apiKey, secretKey } = getCredentials();
  
  try {
    const response = await fetch(
      `${ALPACA_CRYPTO_DATA_URL}/bars?symbols=${formattedSymbol}&timeframe=${timeframe}&limit=${limit}`,
      {
        headers: {
          "APCA-API-KEY-ID": apiKey,
          "APCA-API-SECRET-KEY": secretKey,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const bars = data.bars?.[formattedSymbol] || [];
      
      if (bars.length > 0) {
        const result = {
          close: bars.map((b: any) => b.c),
          high: bars.map((b: any) => b.h),
          low: bars.map((b: any) => b.l),
          open: bars.map((b: any) => b.o),
          volume: bars.map((b: any) => b.v),
        };
        // Cache the result
        cryptoBarsCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
      // No bars from Alpaca for this symbol, try CoinGecko
    } else {
      console.log(`Alpaca crypto returned ${response.status} for ${symbol}`);
    }
  } catch (error) {
    console.log(`Alpaca crypto error for ${symbol}: ${error}`);
  }

  // Fall back to CoinGecko (with built-in rate limiting and caching)
  try {
    const result = await getCryptoBarsFromCoinGecko(symbol, limit);
    // Cache the result
    cryptoBarsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    // Return empty data if both sources fail
    console.log(`⚠️ No crypto data available for ${symbol}`);
    return { close: [], high: [], low: [], open: [], volume: [] };
  }
}

// Rate limiting for CoinGecko (free tier: 10-30 calls/minute)
let lastCoinGeckoCall = 0;
const COINGECKO_RATE_LIMIT_MS = 3000; // 3 seconds between calls

// OHLC data cache to avoid repeated API calls
const ohlcCache: Map<string, { data: any; timestamp: number }> = new Map();
const OHLC_CACHE_TTL = 5 * 60 * 1000; // 5 minute cache for OHLC data

async function rateLimitedCoinGeckoFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastCall = now - lastCoinGeckoCall;
  
  if (timeSinceLastCall < COINGECKO_RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, COINGECKO_RATE_LIMIT_MS - timeSinceLastCall));
  }
  
  lastCoinGeckoCall = Date.now();
  return fetch(url);
}

// Get crypto data from CoinGecko (free, no auth) with caching
async function getCryptoBarsFromCoinGecko(
  symbol: string,
  days: number = 100
): Promise<{ close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] }> {
  const coinId = CRYPTO_ID_MAP[symbol];
  if (!coinId) {
    console.log(`⚠️ Unknown crypto symbol: ${symbol}, using bitcoin as fallback`);
  }
  
  const id = coinId || "bitcoin";
  const cacheKey = `${symbol}-${days}`;
  
  // Check cache first
  const cached = ohlcCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < OHLC_CACHE_TTL) {
    return cached.data;
  }
  
  // CoinGecko OHLC only supports specific day values: 1, 7, 14, 30, 90, 180, 365, max
  const allowedDays = [1, 7, 14, 30, 90, 180, 365];
  const closestDays = allowedDays.reduce((prev, curr) => 
    Math.abs(curr - days) < Math.abs(prev - days) ? curr : prev
  );
  const url = `${COINGECKO_API_URL}/coins/${id}/ohlc?vs_currency=usd&days=${closestDays}`;
  
  try {
    const response = await rateLimitedCoinGeckoFetch(url);
    
    if (!response.ok) {
      // Handle rate limiting - return cached data if available
      if (response.status === 429) {
        console.log("⚠️ CoinGecko rate limited, using cached data if available");
        if (cached) return cached.data;
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 30000));
        const retryResponse = await rateLimitedCoinGeckoFetch(url);
        if (!retryResponse.ok) {
          throw new Error(`CoinGecko API error after retry: ${retryResponse.status}`);
        }
        const data = await retryResponse.json();
        const parsed = parseOhlcData(data);
        ohlcCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
        return parsed;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const parsed = parseOhlcData(data);
    ohlcCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
    return parsed;
  } catch (error) {
    // Return cached data on error
    if (cached) {
      console.log(`Using cached OHLC data for ${symbol}`);
      return cached.data;
    }
    console.error(`CoinGecko fetch error for ${symbol}:`, error);
    // Return empty data on error to allow graceful degradation
    return { open: [], high: [], low: [], close: [], volume: [] };
  }
}

function parseOhlcData(data: number[][]): { close: number[]; high: number[]; low: number[]; open: number[]; volume: number[] } {
  if (!Array.isArray(data) || data.length === 0) {
    return { open: [], high: [], low: [], close: [], volume: [] };
  }
  // CoinGecko OHLC format: [timestamp, open, high, low, close]
  return {
    open: data.map((d: number[]) => d[1]),
    high: data.map((d: number[]) => d[2]),
    low: data.map((d: number[]) => d[3]),
    close: data.map((d: number[]) => d[4]),
    volume: data.map(() => 0), // Volume not available from CoinGecko OHLC
  };
}

// Get latest crypto price (tries Alpaca first, falls back to CoinGecko)
export async function getLatestCryptoPrice(symbol: string): Promise<number> {
  // Try Alpaca first if available
  if (alpacaCryptoAvailable !== false) {
    try {
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

      if (response.ok) {
        const data = await response.json();
        const price = data.trades?.[formattedSymbol]?.p;
        if (price) return price;
      }
    } catch (error) {
      // Fall through to CoinGecko
    }
  }

  // Fall back to CoinGecko
  return getCryptoPriceFromCoinGecko(symbol);
}

// Price cache for when CoinGecko is rate limited
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();
const PRICE_CACHE_TTL = 60 * 60 * 1000; // 1 hour cache validity

// Fallback prices (approximate, updated periodically)
const FALLBACK_PRICES: Record<string, number> = {
  "BTC/USD": 78000,
  "ETH/USD": 3200,
  "SOL/USD": 120,
  "DOGE/USD": 0.25,
  "AVAX/USD": 35,
  "LINK/USD": 15,
  "UNI/USD": 12,
  "AAVE/USD": 280,
  "LTC/USD": 95,
  "BCH/USD": 450,
};

// Get crypto price from CoinGecko with caching
async function getCryptoPriceFromCoinGecko(symbol: string): Promise<number> {
  const coinId = CRYPTO_ID_MAP[symbol] || "bitcoin";
  const url = `${COINGECKO_API_URL}/simple/price?ids=${coinId}&vs_currencies=usd`;
  
  // Check cache first
  const cached = priceCache.get(symbol);
  const now = Date.now();
  
  try {
    const response = await rateLimitedCoinGeckoFetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.log("⚠️ CoinGecko rate limited, using cached/fallback price");
        // Return cached price if valid
        if (cached && (now - cached.timestamp) < PRICE_CACHE_TTL) {
          return cached.price;
        }
        // Return fallback price
        return FALLBACK_PRICES[symbol] || 1000;
      }
      throw new Error(`CoinGecko price API error: ${response.status}`);
    }
    
    const data = await response.json();
    const price = data[coinId]?.usd || 0;
    
    // Update cache
    if (price > 0) {
      priceCache.set(symbol, { price, timestamp: now });
    }
    
    return price || FALLBACK_PRICES[symbol] || 1000;
  } catch (error) {
    console.log(`CoinGecko error for ${symbol}, using fallback`);
    // Return cached price if available
    if (cached && (now - cached.timestamp) < PRICE_CACHE_TTL) {
      return cached.price;
    }
    return FALLBACK_PRICES[symbol] || 1000;
  }
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

// Check if crypto trading is available on Alpaca
export function isCryptoTradingAvailable(): boolean {
  return alpacaCryptoAvailable === true;
}

// Check if crypto data is available (CoinGecko fallback always works)
export function isCryptoDataAvailable(): boolean {
  return true; // CoinGecko is always available
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
