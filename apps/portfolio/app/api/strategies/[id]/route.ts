import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Update strategy status
    const { error: updateError } = await supabase
      .from("strategies")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating strategy:", updateError);
      return NextResponse.json(
        { error: "Failed to update strategy" },
        { status: 500 }
      );
    }

    // Log the action
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
  } catch (error) {
    console.error("Strategy control error:", error);
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
    const { id } = await params;
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
  } catch (error) {
    console.error("Strategy fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
