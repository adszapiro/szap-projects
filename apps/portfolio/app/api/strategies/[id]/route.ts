import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lazy initialization to avoid build-time errors
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error("Supabase credentials not configured");
    }

    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

/**
 * Verify the request has a valid API secret.
 * The dashboard sends this as a Bearer token.
 */
function verifyAuth(request: NextRequest): boolean {
  const secret = process.env.DASHBOARD_API_SECRET;
  if (!secret) return false; // Fail closed if secret not configured

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  return token === secret;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid strategy ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !["pause", "resume"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'pause' or 'resume'" },
        { status: 400 }
      );
    }

    const newStatus = action === "pause" ? "paused" : "deployed";
    const supabase = getSupabase();

    const { error: updateError } = await supabase
      .from("strategies")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update strategy" },
        { status: 500 }
      );
    }

    await supabase.from("agent_logs").insert({
      level: "info",
      action: `strategy_${action}d`,
      data: { strategyId: id, source: "dashboard" },
    });

    return NextResponse.json({
      success: true,
      message: `Strategy ${action}d successfully`,
      status: newStatus,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid strategy ID" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("strategies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
