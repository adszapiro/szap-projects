// Blockchain data fetching using free public APIs
// No API key needed for basic functionality
//
// ============================================================================
// IMPORTANT: DATA SOURCES
// ============================================================================
// - ETH Balance: REAL data via public RPC (eth.llamarpc.com)
// - ETH Price: REAL data via CoinGecko API
// - Token Holdings: SIMULATED (demo data based on address hash)
// - Transactions: SIMULATED (demo data based on address hash)
//
// To enable REAL token data, integrate one of these APIs:
// - Alchemy: https://docs.alchemy.com/reference/alchemy-gettokenbalances
// - Moralis: https://docs.moralis.io/web3-data-api/evm/reference/get-wallet-token-balances
// - Infura: https://docs.infura.io/api/networks/ethereum
//
// Example Alchemy integration:
// const response = await fetch(
//   `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
//   {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       jsonrpc: '2.0',
//       method: 'alchemy_getTokenBalances',
//       params: [address],
//       id: 1
//     })
//   }
// );
// ============================================================================

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  price: number;
  change24h: number;
  contractAddress?: string;
}

export interface Transaction {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: number;
  type: "send" | "receive" | "swap" | "contract";
}

export interface WalletAnalysis {
  address: string;
  chain: "ethereum" | "solana";
  ethBalance: number;
  ethUsdValue: number;
  totalValue: number;
  tokens: TokenBalance[];
  recentTransactions: Transaction[];
  riskScore: number;
  riskFactors: {
    factor: string;
    impact: "low" | "medium" | "high";
    description: string;
  }[];
  diversificationScore: number;
  activityLevel: "low" | "medium" | "high";
}

// Fetch ETH price from CoinGecko
export async function getEthPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  );
  const data = await res.json();
  return data.ethereum?.usd || 0;
}

// Validate Ethereum address
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Fetch wallet data using public RPC
export async function analyzeWallet(address: string): Promise<WalletAnalysis> {
  // Validate address
  if (!isValidEthAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }

  // Fetch ETH balance using public Ethereum RPC
  const ethBalanceHex = await fetchEthBalance(address);
  const ethBalance = parseInt(ethBalanceHex, 16) / 1e18;
  
  // Get ETH price
  const ethPrice = await getEthPrice();
  const ethUsdValue = ethBalance * ethPrice;

  // Simulate token holdings (in production, use Alchemy/Moralis)
  // For demo, we'll show example tokens
  const tokens = await getTokenHoldings(address, ethPrice);
  
  // Calculate total value
  const tokenValue = tokens.reduce((sum, t) => sum + t.usdValue, 0);
  const totalValue = ethUsdValue + tokenValue;

  // Get recent transactions (simulated for demo)
  const recentTransactions = await getRecentTransactions(address);

  // Calculate risk score
  const { riskScore, riskFactors } = calculateRisk(
    ethBalance,
    tokens,
    totalValue,
    recentTransactions
  );

  // Calculate diversification
  const diversificationScore = calculateDiversification(ethUsdValue, tokens, totalValue);

  // Determine activity level
  const activityLevel = determineActivityLevel(recentTransactions);

  return {
    address,
    chain: "ethereum",
    ethBalance,
    ethUsdValue,
    totalValue,
    tokens,
    recentTransactions,
    riskScore,
    riskFactors,
    diversificationScore,
    activityLevel,
  };
}

// Fetch ETH balance from public RPC
async function fetchEthBalance(address: string): Promise<string> {
  const res = await fetch("https://eth.llamarpc.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
  });
  
  const data = await res.json();
  return data.result || "0x0";
}

// Get token holdings (simulated for demo)
async function getTokenHoldings(address: string, ethPrice: number): Promise<TokenBalance[]> {
  // In production, use Alchemy's getTokenBalances or similar
  // For demo, return example tokens based on address hash
  const hash = address.slice(2, 10);
  const seed = parseInt(hash, 16);
  
  // Simulate based on address (makes it consistent per wallet)
  const hasUsdc = seed % 3 === 0;
  const hasUsdt = seed % 5 === 0;
  const hasLink = seed % 7 === 0;
  const hasUni = seed % 11 === 0;
  
  const tokens: TokenBalance[] = [];
  
  if (hasUsdc) {
    tokens.push({
      symbol: "USDC",
      name: "USD Coin",
      balance: (seed % 10000) + 100,
      usdValue: (seed % 10000) + 100,
      price: 1.00,
      change24h: 0.01,
    });
  }
  
  if (hasUsdt) {
    tokens.push({
      symbol: "USDT",
      name: "Tether",
      balance: (seed % 5000) + 50,
      usdValue: (seed % 5000) + 50,
      price: 1.00,
      change24h: -0.02,
    });
  }
  
  if (hasLink) {
    const linkPrice = 15.50;
    const linkBalance = ((seed % 100) + 10) / 10;
    tokens.push({
      symbol: "LINK",
      name: "Chainlink",
      balance: linkBalance,
      usdValue: linkBalance * linkPrice,
      price: linkPrice,
      change24h: 3.2,
    });
  }
  
  if (hasUni) {
    const uniPrice = 8.75;
    const uniBalance = ((seed % 50) + 5) / 5;
    tokens.push({
      symbol: "UNI",
      name: "Uniswap",
      balance: uniBalance,
      usdValue: uniBalance * uniPrice,
      price: uniPrice,
      change24h: -1.5,
    });
  }

  return tokens;
}

// Get recent transactions (simulated for demo)
async function getRecentTransactions(address: string): Promise<Transaction[]> {
  // In production, use Etherscan API or similar
  const hash = address.slice(2, 10);
  const seed = parseInt(hash, 16);
  
  const now = Date.now();
  const day = 86400000;
  
  const txCount = (seed % 5) + 1;
  const transactions: Transaction[] = [];
  
  for (let i = 0; i < txCount; i++) {
    const isReceive = (seed + i) % 2 === 0;
    transactions.push({
      hash: `0x${(seed + i).toString(16).padStart(64, "0")}`,
      timestamp: now - (i * day) - (seed % day),
      from: isReceive ? `0x${"a".repeat(40)}` : address,
      to: isReceive ? address : `0x${"b".repeat(40)}`,
      value: ((seed + i) % 1000) / 100,
      type: isReceive ? "receive" : "send",
    });
  }
  
  return transactions;
}

// Calculate risk score
function calculateRisk(
  ethBalance: number,
  tokens: TokenBalance[],
  totalValue: number,
  transactions: Transaction[]
): { riskScore: number; riskFactors: WalletAnalysis["riskFactors"] } {
  const riskFactors: WalletAnalysis["riskFactors"] = [];
  let riskScore = 100; // Start at 100 (low risk)

  // Check concentration
  if (totalValue > 0) {
    const maxHolding = Math.max(
      ...tokens.map(t => t.usdValue / totalValue),
      ethBalance > 0 ? (ethBalance * 2000) / totalValue : 0
    );
    
    if (maxHolding > 0.8) {
      riskScore -= 30;
      riskFactors.push({
        factor: "High Concentration",
        impact: "high",
        description: "Over 80% of portfolio in single asset",
      });
    } else if (maxHolding > 0.5) {
      riskScore -= 15;
      riskFactors.push({
        factor: "Moderate Concentration",
        impact: "medium",
        description: "Over 50% of portfolio in single asset",
      });
    }
  }

  // Check volatility exposure
  const volatileTokens = tokens.filter(t => Math.abs(t.change24h) > 5);
  if (volatileTokens.length > 0) {
    riskScore -= volatileTokens.length * 5;
    riskFactors.push({
      factor: "Volatile Assets",
      impact: "medium",
      description: `${volatileTokens.length} token(s) with >5% 24h change`,
    });
  }

  // Check stablecoin exposure (lower risk if high)
  const stableValue = tokens
    .filter(t => ["USDC", "USDT", "DAI"].includes(t.symbol))
    .reduce((sum, t) => sum + t.usdValue, 0);
  
  if (totalValue > 0 && stableValue / totalValue > 0.5) {
    riskScore += 10;
    riskFactors.push({
      factor: "Stablecoin Buffer",
      impact: "low",
      description: "Over 50% in stablecoins (lower volatility)",
    });
  }

  // Clamp score
  riskScore = Math.max(0, Math.min(100, riskScore));

  return { riskScore, riskFactors };
}

// Calculate diversification score
function calculateDiversification(
  ethUsdValue: number,
  tokens: TokenBalance[],
  totalValue: number
): number {
  if (totalValue === 0) return 0;
  
  const holdings = [ethUsdValue, ...tokens.map(t => t.usdValue)].filter(v => v > 0);
  
  if (holdings.length <= 1) return 20;
  if (holdings.length === 2) return 40;
  if (holdings.length === 3) return 60;
  if (holdings.length === 4) return 80;
  return 100;
}

// Determine activity level
function determineActivityLevel(transactions: Transaction[]): "low" | "medium" | "high" {
  if (transactions.length === 0) return "low";
  if (transactions.length < 3) return "low";
  if (transactions.length < 7) return "medium";
  return "high";
}
