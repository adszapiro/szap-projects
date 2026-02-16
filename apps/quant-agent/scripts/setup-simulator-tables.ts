/**
 * Create simulator tables in Supabase
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
);

async function setupTables() {
  console.log("🔧 Setting up simulator tables...\n");

  // Check if tables exist by trying to query them
  const { error: posError } = await supabase
    .from("simulated_positions")
    .select("id")
    .limit(1);

  if (posError && posError.code === "42P01") {
    console.log("❌ simulated_positions table does not exist");
    console.log("\nPlease run the following SQL in Supabase SQL Editor:\n");
    console.log(`
-- Simulated positions table for crypto paper trading
CREATE TABLE IF NOT EXISTS simulated_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  avg_entry_price NUMERIC NOT NULL,
  trade_id TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  UNIQUE(symbol, status)
);

-- Simulated account table for cash balance
CREATE TABLE IF NOT EXISTS simulated_account (
  id TEXT PRIMARY KEY,
  cash NUMERIC NOT NULL DEFAULT 50000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_simulated_positions_status ON simulated_positions(status);
CREATE INDEX IF NOT EXISTS idx_simulated_positions_symbol ON simulated_positions(symbol);

-- Initialize crypto account
INSERT INTO simulated_account (id, cash) VALUES ('crypto', 50000) ON CONFLICT (id) DO NOTHING;
    `);
    return;
  } else if (posError) {
    console.log("Positions table check:", posError.message);
  } else {
    console.log("✅ simulated_positions table exists");
  }

  const { error: accError } = await supabase
    .from("simulated_account")
    .select("id")
    .limit(1);

  if (accError && accError.code === "42P01") {
    console.log("❌ simulated_account table does not exist");
  } else if (accError) {
    console.log("Account table check:", accError.message);
  } else {
    console.log("✅ simulated_account table exists");
  }

  // Initialize account if needed
  const { data: account } = await supabase
    .from("simulated_account")
    .select("*")
    .eq("id", "crypto")
    .single();

  if (!account) {
    console.log("\nInitializing crypto account...");
    const { error } = await supabase
      .from("simulated_account")
      .insert({ id: "crypto", cash: 50000 });

    if (error) {
      console.log("Error creating account:", error.message);
    } else {
      console.log("✅ Created crypto account with $50,000");
    }
  } else {
    console.log(`\n💰 Crypto account balance: $${account.cash}`);
  }

  // Check open positions
  const { data: positions } = await supabase
    .from("simulated_positions")
    .select("*")
    .eq("status", "open");

  if (positions && positions.length > 0) {
    console.log(`\n📊 Open positions: ${positions.length}`);
    for (const p of positions) {
      console.log(`   - ${p.symbol}: ${p.qty} @ $${p.avg_entry_price}`);
    }
  } else {
    console.log("\n📊 No open positions");
  }
}

setupTables().catch(console.error);
