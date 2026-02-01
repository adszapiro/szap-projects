import { NextRequest, NextResponse } from 'next/server';
import { OHLCV } from '@/lib/types';
import { getCachedData, cacheData, CachedPriceData } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type') as 'stock' | 'crypto';
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');

  if (!symbol || !type || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  try {
    // Try to get cached data first
    const cachedData = await getCachedData(symbol, type, startDate, endDate);
    
    if (cachedData && cachedData.length > 0) {
      // Convert cached data to OHLCV format
      const data: OHLCV[] = cachedData.map(d => ({
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));
      
      return NextResponse.json(data, {
        headers: { 'X-Data-Source': 'cache' }
      });
    }

    // Fetch fresh data
    let data: OHLCV[];

    if (type === 'stock') {
      data = await fetchYahooFinance(symbol, startDate, endDate);
    } else if (type === 'crypto') {
      data = await fetchCoinGecko(symbol, startDate, endDate);
    } else {
      return NextResponse.json(
        { error: 'Invalid asset type' },
        { status: 400 }
      );
    }

    // Cache the data in background (don't await)
    const cacheDataFormatted: CachedPriceData[] = data.map(d => ({
      symbol,
      asset_type: type,
      date: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
    
    cacheData(symbol, type, cacheDataFormatted).catch(() => {
      // Silently ignore cache errors
    });

    return NextResponse.json(data, {
      headers: { 'X-Data-Source': 'api' }
    });
  } catch (error) {
    console.error('Data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

async function fetchYahooFinance(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<OHLCV[]> {
  // Convert dates to Unix timestamps
  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(new Date(endDate).getTime() / 1000);

  // Yahoo Finance v8 API
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }

  const json = await response.json();
  const result = json.chart.result[0];

  if (!result || !result.timestamp) {
    throw new Error('No data returned from Yahoo Finance');
  }

  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];

  const data: OHLCV[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (quotes.open[i] !== null && quotes.close[i] !== null) {
      data.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i] || 0,
      });
    }
  }

  return data;
}

async function fetchCoinGecko(
  coinId: string,
  startDate: string,
  endDate: string
): Promise<OHLCV[]> {
  // Calculate days between dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // CoinGecko market chart API
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const json = await response.json();

  // CoinGecko returns prices as [timestamp, price] pairs
  // We'll create OHLCV from daily prices (simplified - using close for all)
  const prices = json.prices;
  const volumes = json.total_volumes;

  // Group by day and create OHLCV
  const dailyData: Map<string, { prices: number[]; volume: number }> = new Map();

  for (let i = 0; i < prices.length; i++) {
    const date = new Date(prices[i][0]).toISOString().split('T')[0];
    const price = prices[i][1];
    const volume = volumes[i] ? volumes[i][1] : 0;

    if (!dailyData.has(date)) {
      dailyData.set(date, { prices: [], volume: 0 });
    }

    const day = dailyData.get(date)!;
    day.prices.push(price);
    day.volume = volume;
  }

  const data: OHLCV[] = [];

  dailyData.forEach((day, date) => {
    if (day.prices.length > 0) {
      data.push({
        date,
        open: day.prices[0],
        high: Math.max(...day.prices),
        low: Math.min(...day.prices),
        close: day.prices[day.prices.length - 1],
        volume: day.volume,
      });
    }
  });

  // Sort by date
  data.sort((a, b) => a.date.localeCompare(b.date));

  // Filter to requested date range
  return data.filter(d => d.date >= startDate && d.date <= endDate);
}
