# WalletScope

Ethereum wallet analyzer with real-time balance fetching, portfolio visualization, and risk scoring.

## Features

- **Real-Time Balance** - Fetches ETH balance from Ethereum RPC
- **Token Holdings** - Displays ERC-20 token balances with USD values
- **Portfolio Distribution** - Pie chart visualization of asset allocation
- **Risk Scoring** - Analyzes concentration, volatility, and diversification
- **Recent Searches** - Saves search history for quick access
- **Demo Mode** - Auto-loads Vitalik's wallet on first visit

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **Charts**: Recharts
- **Blockchain**: Ethereum RPC (via LlamaRPC)
- **Price Data**: CoinGecko API
- **Styling**: Tailwind CSS v4

## Quick Start

```bash
# From the monorepo root
npm run dev -w wallet-scope

# Or from this directory
npm run dev
```

The app runs on `http://localhost:3000` by default.

## How It Works

1. **Enter Wallet Address** - Paste any Ethereum address (0x...)
2. **View Holdings** - See ETH balance and token holdings with USD values
3. **Analyze Risk** - Review risk factors based on portfolio composition
4. **Explore Further** - Click through to Etherscan for transaction details

## API Details

- **ETH Balance**: Fetched via `eth_getBalance` RPC call
- **ETH Price**: CoinGecko API (free tier)
- **Token Balances**: Simulated for demo (real data requires Alchemy/Moralis)

## Note on Demo Data

ETH balance is real. Token holdings are simulated for demonstration purposes. 
For production use, integrate with Alchemy or Moralis for real token data.

## License

MIT
