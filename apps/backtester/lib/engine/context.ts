import { OHLCV, Trade } from "../types";
import { sma, ema, rsi, macd, bollingerBands } from "../indicators";

export interface TradingContext {
  position: boolean;
  cash: number;
  shares: number;
  trades: Trade[];
  buy: (index: number) => void;
  sell: (index: number) => void;
}

export interface IndicatorFunctions {
  sma: (prices: number[], period: number) => (number | null)[];
  ema: (prices: number[], period: number) => (number | null)[];
  rsi: (prices: number[], period: number) => (number | null)[];
  macd: (prices: number[], fast?: number, slow?: number, signal?: number) => {
    macd: (number | null)[];
    signal: (number | null)[];
    histogram: (number | null)[];
  };
  bollinger: (prices: number[], period?: number, stdDev?: number) => {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  };
}

export function createTradingContext(
  data: OHLCV[],
  initialCapital: number
): TradingContext {
  let position = false;
  let cash = initialCapital;
  let shares = 0;
  const trades: Trade[] = [];

  const buy = (index: number) => {
    if (position || index < 0 || index >= data.length) return;

    const price = data[index].close;
    const sharesToBuy = Math.floor(cash / price);

    if (sharesToBuy > 0) {
      const value = sharesToBuy * price;
      cash -= value;
      shares = sharesToBuy;
      position = true;

      trades.push({
        type: "buy",
        date: data[index].date,
        price,
        shares: sharesToBuy,
        value,
      });
    }
  };

  const sell = (index: number) => {
    if (!position || index < 0 || index >= data.length || shares === 0) return;

    const price = data[index].close;
    const value = shares * price;
    cash += value;

    trades.push({
      type: "sell",
      date: data[index].date,
      price,
      shares,
      value,
    });

    shares = 0;
    position = false;
  };

  return {
    get position() {
      return position;
    },
    get cash() {
      return cash;
    },
    get shares() {
      return shares;
    },
    get trades() {
      return trades;
    },
    buy,
    sell,
  };
}

export function createIndicatorFunctions(): IndicatorFunctions {
  return {
    sma,
    ema,
    rsi,
    macd: (prices, fast = 12, slow = 26, signal = 9) =>
      macd(prices, fast, slow, signal),
    bollinger: (prices, period = 20, stdDev = 2) =>
      bollingerBands(prices, period, stdDev),
  };
}
