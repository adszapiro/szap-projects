# Paper Trading Bot

Real-time paper trading dashboard connected to Alpaca for simulated trading with real market data.

## Features

- **Account Dashboard** - View buying power, portfolio value, and cash balance
- **Positions Table** - Monitor open positions with P&L and market value
- **Orders Table** - Track pending and filled orders
- **Trade Execution** - Place market and limit orders directly from the UI
- **Demo Mode** - Works without API keys using sample data
- **Auto-Refresh** - Updates every 30 seconds

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **Trading API**: Alpaca Markets (paper trading)
- **Styling**: Tailwind CSS v4

## Quick Start

```bash
# Set up environment variable
cp .env.example .env.local
# Add your Alpaca API keys to .env.local

# From the monorepo root
npm run dev -w trading-bot

# Or from this directory
npm run dev
```

The app runs on `http://localhost:3000` by default.

## Environment Variables

```env
# Get your keys at https://alpaca.markets/
ALPACA_API_KEY=your-paper-api-key
ALPACA_SECRET_KEY=your-paper-secret-key
ALPACA_PAPER=true

# Optional: API authentication for endpoints
TRADING_API_KEY=your-secure-random-key
```

## Demo Mode

If no Alpaca API keys are configured, the app runs in demo mode with:
- Sample account balance ($100,000)
- Example positions (AAPL, GOOGL, MSFT)
- Simulated orders

This allows showcasing the UI without exposing real credentials.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/account` | GET | Get account balance and buying power |
| `/api/positions` | GET | Get current positions |
| `/api/orders` | GET/POST/DELETE | Manage orders |
| `/api/trade` | POST | Execute quick trades |

## Security

- API routes are protected by middleware authentication
- Input validation on all endpoints (symbol, quantity, price)
- Request timeouts to prevent hanging

## License

MIT
