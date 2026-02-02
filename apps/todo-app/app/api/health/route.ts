import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and load balancers
 * GET /api/health
 */
export async function GET() {
  const hasSupabase = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return NextResponse.json({
    status: "healthy",
    service: "todo-app",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      supabase: hasSupabase ? "configured" : "not configured",
    },
  });
}
