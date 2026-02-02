import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi";

/**
 * OpenAPI Specification endpoint
 * GET /api/openapi
 *
 * Returns the OpenAPI 3.0 specification for the Trading Bot API.
 * Can be used with Swagger UI, Postman, or other OpenAPI tools.
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
