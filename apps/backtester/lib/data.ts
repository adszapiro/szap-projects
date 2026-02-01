import { OHLCV } from './types';

// Fetch stock data from Yahoo Finance via API route
export async function fetchStockData(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<OHLCV[]> {
  const response = await fetch(
    `/api/data?symbol=${symbol}&type=stock&start=${startDate}&end=${endDate}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch stock data: ${response.statusText}`);
  }
  
  return response.json();
}

// Fetch crypto data from CoinGecko via API route
export async function fetchCryptoData(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<OHLCV[]> {
  const response = await fetch(
    `/api/data?symbol=${symbol}&type=crypto&start=${startDate}&end=${endDate}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch crypto data: ${response.statusText}`);
  }
  
  return response.json();
}

// Unified fetch function
export async function fetchMarketData(
  symbol: string,
  assetType: 'stock' | 'crypto',
  startDate: string,
  endDate: string
): Promise<OHLCV[]> {
  if (assetType === 'stock') {
    return fetchStockData(symbol, startDate, endDate);
  } else {
    return fetchCryptoData(symbol, startDate, endDate);
  }
}

// Popular assets for quick selection
export const popularStocks = [
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Google' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'Nvidia' },
];

export const popularCrypto = [
  { symbol: 'bitcoin', name: 'Bitcoin (BTC)' },
  { symbol: 'ethereum', name: 'Ethereum (ETH)' },
  { symbol: 'solana', name: 'Solana (SOL)' },
  { symbol: 'cardano', name: 'Cardano (ADA)' },
  { symbol: 'ripple', name: 'XRP' },
  { symbol: 'dogecoin', name: 'Dogecoin (DOGE)' },
];
