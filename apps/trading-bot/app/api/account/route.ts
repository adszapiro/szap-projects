import { NextResponse } from "next/server";
import { getAccount, getClock, AlpacaCredentials } from "@/lib/alpaca";

function getCredentials(): AlpacaCredentials | null {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  const paper = process.env.ALPACA_PAPER !== "false";

  if (!apiKey || !secretKey) {
    return null;
  }

  return { apiKey, secretKey, paper };
}

export async function GET() {
  try {
    const credentials = getCredentials();
    
    if (!credentials) {
      return NextResponse.json(
        { 
          error: "Alpaca API keys not configured",
          configured: false,
          message: "Add ALPACA_API_KEY and ALPACA_SECRET_KEY to your environment variables"
        },
        { status: 200 } // Return 200 so UI can show setup instructions
      );
    }

    const [account, clock] = await Promise.all([
      getAccount(credentials),
      getClock(credentials),
    ]);

    return NextResponse.json({
      configured: true,
      account: {
        id: account.id,
        accountNumber: account.account_number,
        status: account.status,
        currency: account.currency,
        cash: parseFloat(String(account.cash)),
        portfolioValue: parseFloat(String(account.portfolio_value)),
        buyingPower: parseFloat(String(account.buying_power)),
        equity: parseFloat(String(account.equity)),
        lastEquity: parseFloat(String(account.last_equity)),
        daytradeCount: account.daytrade_count,
        patternDayTrader: account.pattern_day_trader,
        dailyPnl: parseFloat(String(account.equity)) - parseFloat(String(account.last_equity)),
        dailyPnlPercent: ((parseFloat(String(account.equity)) - parseFloat(String(account.last_equity))) / parseFloat(String(account.last_equity))) * 100,
      },
      market: {
        isOpen: clock.is_open,
        nextOpen: clock.next_open,
        nextClose: clock.next_close,
      },
      mode: credentials.paper ? "paper" : "live",
    });
  } catch (error) {
    console.error("Account fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch account data", message: String(error) },
      { status: 500 }
    );
  }
}
