import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and load balancers
 * GET /api/health
 */
export async function GET() {
  const hasAlpacaKey = !!process.env.ALPACA_API_KEY;
  const isPaperTrading = process.env.ALPACA_PAPER === "true";

  return NextResponse.json({
    status: "healthy",
    service: "trading-bot",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      alpaca: hasAlpacaKey ? "configured" : "not configured",
      mode: isPaperTrading ? "paper" : "demo",
    },
  });
}
