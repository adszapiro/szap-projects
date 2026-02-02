import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and load balancers
 * GET /api/health
 */
export async function GET() {
  const hasOpenAiKey = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    status: "healthy",
    service: "resume-ai",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      openai: hasOpenAiKey ? "configured" : "not configured",
    },
  });
}
