import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to protect API routes from unauthorized access.
 * 
 * For production, this should use proper session-based authentication (NextAuth).
 * For now, we use a simple API key approach for the demo.
 * 
 * The API key is set via TRADING_API_KEY environment variable.
 * Requests must include either:
 * - Authorization: Bearer <key> header
 * - x-api-key: <key> header
 */
export function middleware(request: NextRequest) {
  // Only protect API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Get API key from environment
  const expectedApiKey = process.env.TRADING_API_KEY;

  // If no API key is configured, allow access (development mode)
  // In production, this should block access
  if (!expectedApiKey) {
    // Add warning header in development
    const response = NextResponse.next();
    response.headers.set("X-Auth-Warning", "No API key configured - running in open mode");
    return response;
  }

  // Check for API key in headers
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  let providedKey: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    providedKey = authHeader.slice(7);
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader;
  }

  // Validate the key
  if (!providedKey || providedKey !== expectedApiKey) {
    return NextResponse.json(
      { 
        error: "Unauthorized", 
        message: "Valid API key required. Set x-api-key header or Authorization: Bearer <key>" 
      },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
