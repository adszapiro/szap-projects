import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and load balancers
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "wallet-scope",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      ethereum: "llama-rpc",
      pricing: "coingecko",
    },
  });
}
