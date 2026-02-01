# Development Resources

Quick reference for tools, APIs, and libraries useful for quant/trading projects.

## Installed Skills

These skills are now available to help with development:

| Skill | Use Case |
|-------|----------|
| `vercel-deploy` | Deploy to Vercel faster |
| `playwright` | Browser automation & E2E testing |
| `gh-fix-ci` | Debug and fix CI failures |
| `gh-address-comments` | Address PR review comments |
| `screenshot` | Take screenshots of apps |

## Essential APIs

### Market Data

```bash
# Yahoo Finance (free, unlimited)
pip install yfinance

# CoinGecko (free tier)
# API: https://api.coingecko.com/api/v3/

# Alpaca (free paper trading)
pip install alpaca-py
# Docs: https://alpaca.markets/docs/
```

### Exchange Connectivity

```bash
# CCXT - 100+ exchanges unified API
pip install ccxt

# Example usage:
# import ccxt
# exchange = ccxt.binance()
# ticker = exchange.fetch_ticker('BTC/USDT')
```

## Quant Libraries

### Backtesting

```bash
pip install backtrader     # Full-featured
pip install backtesting    # Lightweight
pip install vectorbt       # Ultra-fast (vectorized)
```

### Technical Indicators

```bash
pip install pandas-ta      # 130+ indicators
pip install ta-lib         # Industry standard (needs C library)
pip install finta          # Pure Python
```

### Portfolio Optimization

```bash
pip install PyPortfolioOpt   # Mean-variance, HRP, Black-Litterman
pip install Riskfolio-Lib    # Advanced optimization
pip install cvxpy            # Convex optimization
```

### Risk Analytics

```bash
pip install quantstats       # Portfolio analytics
pip install pyfolio-reloaded # Performance tearsheets
pip install empyrical-reloaded # Risk metrics
```

## Trading Bot Frameworks

```bash
# Freqtrade - Most popular crypto bot
pip install freqtrade

# Hummingbot - Market making
# Install: https://hummingbot.org/installation/

# Jesse - Advanced crypto trading
pip install jesse
```

## DeFi Development

```bash
# Hardhat (JavaScript/TypeScript)
npm install --save-dev hardhat

# Foundry (Rust-based)
curl -L https://foundry.paradigm.xyz | bash

# Web3 Libraries
npm install ethers viem
pip install web3
```

## UI Components

```bash
# Already installed in backtester:
# - lightweight-charts (TradingView)
# - @monaco-editor/react
# - lucide-react

# Additional options:
npm install @tremor/react    # Dashboard components
npm install recharts         # Charts
```

## Awesome Lists (Bookmark These)

- [awesome-quant](https://github.com/wilsonfreitas/awesome-quant) - 24k stars, THE list
- [awesome-crypto-trading-bots](https://github.com/affl123/awesome-crypto-trading-bots)
- [PRPM Registry](https://prpm.dev) - 7,500+ AI coding packages

## Paper Trading (Free)

| Broker | Markets | Signup |
|--------|---------|--------|
| Alpaca | US Stocks, Crypto | https://alpaca.markets |
| Interactive Brokers | Global | https://www.interactivebrokers.com |
| TradingView | All (charting) | https://tradingview.com |

## Quick Commands

```bash
# Run backtester locally
cd apps/backtester && npm run dev

# Deploy to Vercel
vercel --prod

# Check all projects
npm run build --workspaces
```
