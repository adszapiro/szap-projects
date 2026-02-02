"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Bot, Settings, BarChart3, ArrowLeft } from "lucide-react";
import AccountCard from "@/components/Dashboard/AccountCard";
import PositionsTable from "@/components/Dashboard/PositionsTable";
import OrdersTable from "@/components/Dashboard/OrdersTable";
import TradeForm from "@/components/Trading/TradeForm";

interface AccountData {
  portfolioValue: number;
  cash: number;
  equity: number;
  buyingPower: number;
  dailyPnl: number;
  dailyPnlPercent: number;
}

interface MarketData {
  isOpen: boolean;
  nextOpen: string;
  nextClose: string;
}

interface Position {
  symbol: string;
  qty: number;
  side: "long" | "short";
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlPercent: number;
  changeToday: number;
}

interface Order {
  id: string;
  symbol: string;
  qty: number;
  filledQty: number;
  side: "buy" | "sell";
  type: string;
  status: string;
  limitPrice: number | null;
  filledAvgPrice: number | null;
  createdAt: string;
}

// Demo data for when API is not configured
const DEMO_ACCOUNT: AccountData = {
  portfolioValue: 102547.83,
  cash: 45123.45,
  equity: 102547.83,
  buyingPower: 90246.90,
  dailyPnl: 1234.56,
  dailyPnlPercent: 1.22,
};

const DEMO_MARKET: MarketData = {
  isOpen: true,
  nextOpen: new Date().toISOString(),
  nextClose: new Date().toISOString(),
};

const DEMO_POSITIONS: Position[] = [
  {
    symbol: "AAPL",
    qty: 50,
    side: "long",
    avgEntryPrice: 178.25,
    currentPrice: 185.42,
    marketValue: 9271.00,
    unrealizedPl: 358.50,
    unrealizedPlPercent: 4.02,
    changeToday: 1.25,
  },
  {
    symbol: "MSFT",
    qty: 30,
    side: "long",
    avgEntryPrice: 378.50,
    currentPrice: 392.18,
    marketValue: 11765.40,
    unrealizedPl: 410.40,
    unrealizedPlPercent: 3.61,
    changeToday: 0.85,
  },
  {
    symbol: "NVDA",
    qty: 15,
    side: "long",
    avgEntryPrice: 485.00,
    currentPrice: 512.75,
    marketValue: 7691.25,
    unrealizedPl: 416.25,
    unrealizedPlPercent: 5.72,
    changeToday: 2.15,
  },
];

const DEMO_ORDERS: Order[] = [
  {
    id: "demo-1",
    symbol: "TSLA",
    qty: 10,
    filledQty: 10,
    side: "buy",
    type: "market",
    status: "filled",
    limitPrice: null,
    filledAvgPrice: 248.50,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "demo-2",
    symbol: "AMD",
    qty: 25,
    filledQty: 0,
    side: "buy",
    type: "limit",
    status: "pending",
    limitPrice: 145.00,
    filledAvgPrice: null,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "demo-3",
    symbol: "GOOGL",
    qty: 5,
    filledQty: 5,
    side: "sell",
    type: "market",
    status: "filled",
    limitPrice: null,
    filledAvgPrice: 142.30,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function TradingBotPage() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [mode, setMode] = useState<"paper" | "live">("paper");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);

    try {
      // Fetch account data
      const accountRes = await fetch("/api/account");
      const accountData = await accountRes.json();

      if (accountData.configured === false) {
        setConfigured(false);
        // Show demo data so users can see what the app looks like
        setAccount(DEMO_ACCOUNT);
        setMarket(DEMO_MARKET);
        setPositions(DEMO_POSITIONS);
        setOrders(DEMO_ORDERS);
        setLastUpdate(new Date());
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setConfigured(true);
      setAccount(accountData.account);
      setMarket(accountData.market);
      setMode(accountData.mode);

      // Fetch positions
      const positionsRes = await fetch("/api/positions");
      const positionsData = await positionsRes.json();
      setPositions(positionsData.positions || []);

      // Fetch orders
      const ordersRes = await fetch("/api/orders?status=all");
      const ordersData = await ordersRes.json();
      setOrders((ordersData.orders || []).slice(0, 20));

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleClosePosition = async (symbol: string) => {
    if (!confirm(`Close entire position in ${symbol}?`)) return;

    try {
      await fetch(`/api/positions?symbol=${symbol}`, { method: "DELETE" });
      fetchData(true);
    } catch (error) {
      console.error("Error closing position:", error);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await fetch(`/api/orders?id=${orderId}`, { method: "DELETE" });
      fetchData(true);
    } catch (error) {
      console.error("Error canceling order:", error);
    }
  };

  const handleTrade = async (order: {
    symbol: string;
    side: "buy" | "sell";
    type: "market" | "limit";
    qty: number;
    limitPrice?: number;
  }) => {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: order.symbol,
        qty: order.qty,
        side: order.side,
        type: order.type,
        timeInForce: "day",
        limitPrice: order.limitPrice,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to submit order");
    }

    fetchData(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-[var(--accent-blue)]" />
            <div>
              <h1 className="text-xl font-bold">Paper Trading Bot</h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Powered by Alpaca
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdate && (
              <span className="text-xs text-[var(--text-muted)]">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="text-sm">Refresh</span>
            </button>
            <a
              href="/backtester"
              className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Backtester</span>
            </a>
            <button className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <a
              href="https://alexszapiro.com"
              className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Portfolio</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Demo Mode Banner */}
        {configured === false && !loading && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Bot className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-400">Demo Mode - Sample Data</p>
              <p className="text-sm text-[var(--text-secondary)]">
                You&apos;re viewing sample data to preview the trading dashboard. Configure your Alpaca API keys below to connect your paper trading account.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Account & Trading */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <AccountCard
              account={account}
              market={market}
              mode={mode}
              loading={loading}
            />
            <TradeForm
              onSubmit={handleTrade}
              disabled={configured === false}
            />
          </div>

          {/* Right Column - Positions & Orders */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <PositionsTable
              positions={positions}
              loading={loading}
              onClose={handleClosePosition}
            />
            <OrdersTable
              orders={orders}
              loading={loading}
              onCancel={handleCancelOrder}
            />
          </div>
        </div>

        {/* Setup Instructions */}
        {configured === false && (
          <div className="mt-8 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Setup Guide</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="w-8 h-8 bg-[var(--accent-blue)] rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <h3 className="font-medium">Get Alpaca API Keys</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Sign up at{" "}
                  <a
                    href="https://alpaca.markets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-blue)] hover:underline"
                  >
                    alpaca.markets
                  </a>{" "}
                  and generate paper trading API keys
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 bg-[var(--accent-blue)] rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <h3 className="font-medium">Add Environment Variables</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Create a <code className="bg-[var(--bg-tertiary)] px-1 rounded">.env.local</code> file with your keys:
                </p>
                <pre className="text-xs bg-[var(--bg-tertiary)] p-2 rounded overflow-x-auto">
                  {`ALPACA_API_KEY=your-key
ALPACA_SECRET_KEY=your-secret
ALPACA_PAPER=true`}
                </pre>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 bg-[var(--accent-blue)] rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <h3 className="font-medium">Start Trading</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Restart the dev server and refresh this page. You&apos;ll see your paper trading account with $100,000 virtual cash.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
