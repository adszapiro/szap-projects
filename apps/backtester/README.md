# Algo Trading Backtester

A professional-grade trading strategy backtesting platform supporting 500+ stocks and 50+ crypto pairs.

## Features

- **TradingView-Style Charts** - Interactive candlestick charts with volume, SMA indicators, and trade markers
- **Custom Strategy Editor** - Write JavaScript strategies with Monaco Editor and built-in templates
- **Multi-Asset Support** - Backtest across stocks (via Yahoo Finance) and crypto (via CoinGecko)
- **Risk Analytics** - Sharpe ratio, max drawdown, win rate, and comprehensive trade logs
- **Comparison Mode** - Compare strategy performance across multiple assets
- **Watchlist** - Save frequently tested assets with localStorage persistence

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **Charts**: Lightweight Charts (TradingView library)
- **Code Editor**: Monaco Editor
- **Styling**: Tailwind CSS v4
- **Data**: Yahoo Finance API, CoinGecko API

## Quick Start

```bash
# From the monorepo root
npm run dev -w backtester

# Or from this directory
npm run dev
```

The app runs on `http://localhost:3000` by default.

## How It Works

1. **Select an Asset** - Choose from the watchlist or add a new stock/crypto symbol
2. **Write a Strategy** - Use the built-in SMA crossover template or write custom JavaScript
3. **Run Backtest** - Execute the strategy against historical data
4. **Analyze Results** - View performance metrics, trade log, and equity curve

## Strategy API

Strategies are JavaScript functions that receive price data and return trading signals:

```javascript
function strategy(data, index, portfolio) {
  const sma20 = SMA(data, 20, index);
  const sma50 = SMA(data, 50, index);
  
  if (sma20 > sma50) return "BUY";
  if (sma20 < sma50) return "SELL";
  return "HOLD";
}
```

## License

MIT
