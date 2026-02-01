import { NextResponse } from "next/server";

interface ScreenerResult {
  symbol: string;
  name: string;
  type: "stock" | "crypto";
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  rsi?: number;
  sma20?: number;
  sma50?: number;
}

// Popular stocks and crypto to scan
const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "PG", name: "Procter & Gamble" },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "HD", name: "Home Depot" },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "AMD", name: "AMD Inc." },
  { symbol: "INTC", name: "Intel Corp." },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "ORCL", name: "Oracle Corp." },
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "IWM", name: "Russell 2000 ETF" },
  { symbol: "GLD", name: "Gold ETF" },
  { symbol: "XLF", name: "Financial Sector ETF" },
];

const CRYPTO = [
  { symbol: "bitcoin", name: "Bitcoin" },
  { symbol: "ethereum", name: "Ethereum" },
  { symbol: "solana", name: "Solana" },
  { symbol: "cardano", name: "Cardano" },
  { symbol: "ripple", name: "XRP" },
  { symbol: "dogecoin", name: "Dogecoin" },
  { symbol: "polkadot", name: "Polkadot" },
  { symbol: "avalanche-2", name: "Avalanche" },
  { symbol: "chainlink", name: "Chainlink" },
  { symbol: "litecoin", name: "Litecoin" },
];

export async function GET() {
  try {
    const results: ScreenerResult[] = [];

    // Fetch stock data from Yahoo Finance
    const stockPromises = STOCKS.map(async (stock) => {
      try {
        const data = await fetchStockData(stock.symbol);
        if (data) {
          results.push({
            symbol: stock.symbol,
            name: stock.name,
            type: "stock",
            ...data,
          });
        }
      } catch {
        // Skip failed stocks
      }
    });

    // Fetch crypto data from CoinGecko
    const cryptoPromises = CRYPTO.map(async (crypto) => {
      try {
        const data = await fetchCryptoData(crypto.symbol);
        if (data) {
          results.push({
            symbol: crypto.symbol,
            name: crypto.name,
            type: "crypto",
            ...data,
          });
        }
      } catch {
        // Skip failed crypto
      }
    });

    await Promise.all([...stockPromises, ...cryptoPromises]);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Screener error:", error);
    return NextResponse.json({ error: "Failed to fetch screener data" }, { status: 500 });
  }
}

async function fetchStockData(symbol: string): Promise<Omit<ScreenerResult, "symbol" | "name" | "type"> | null> {
  try {
    // Get current quote
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=60d`;
    const response = await fetch(quoteUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) return null;

    const json = await response.json();
    const result = json.chart?.result?.[0];

    if (!result) return null;

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const closes = quotes?.close?.filter((c: number | null) => c !== null) || [];

    if (closes.length < 2) return null;

    const currentPrice = meta.regularMarketPrice || closes[closes.length - 1];
    const previousClose = closes[closes.length - 2];
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    // Calculate RSI
    const rsi = calculateRSI(closes, 14);

    // Calculate SMAs
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);

    return {
      price: currentPrice,
      change,
      changePercent,
      volume: meta.regularMarketVolume || quotes?.volume?.[quotes.volume.length - 1] || 0,
      marketCap: meta.marketCap,
      rsi,
      sma20,
      sma50,
    };
  } catch {
    return null;
  }
}

async function fetchCryptoData(coinId: string): Promise<Omit<ScreenerResult, "symbol" | "name" | "type"> | null> {
  try {
    // Get current data
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const json = await response.json();

    const currentPrice = json.market_data?.current_price?.usd;
    const change24h = json.market_data?.price_change_24h;
    const changePercent = json.market_data?.price_change_percentage_24h;
    const volume = json.market_data?.total_volume?.usd;
    const marketCap = json.market_data?.market_cap?.usd;

    if (!currentPrice) return null;

    // For crypto, we'd need historical data for RSI/SMA - simplified here
    return {
      price: currentPrice,
      change: change24h || 0,
      changePercent: changePercent || 0,
      volume: volume || 0,
      marketCap,
      rsi: undefined, // Would need historical data
      sma20: undefined,
      sma50: undefined,
    };
  } catch {
    return null;
  }
}

function calculateRSI(prices: number[], period: number): number | undefined {
  if (prices.length < period + 1) return undefined;

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateSMA(prices: number[], period: number): number | undefined {
  if (prices.length < period) return undefined;

  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}
