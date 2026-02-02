/**
 * Database Migration: Research Paper Tournament System
 * 
 * Creates the following tables:
 * - research_papers: Store PDFs and metadata
 * - strategy_performance: Track per-strategy metrics and bandit parameters
 * 
 * Also adds paper_id column to strategies table.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function migrate() {
  console.log("🗄️  Running Tournament System Migration...\n");

  // 1. Create research_papers table
  console.log("Creating research_papers table...");
  const { error: papersError } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS research_papers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        authors TEXT[],
        year INTEGER,
        source TEXT,
        pdf_url TEXT,
        pdf_storage_path TEXT,
        abstract TEXT,
        key_insights TEXT[],
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_research_papers_status ON research_papers(status);
    `,
  });

  if (papersError) {
    // Try direct insert to check if table exists
    const { error: checkError } = await supabase
      .from("research_papers")
      .select("id")
      .limit(1);
    
    if (checkError && checkError.code === "42P01") {
      console.log("  Note: Run this SQL in Supabase dashboard:\n");
      console.log(`
CREATE TABLE IF NOT EXISTS research_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  authors TEXT[],
  year INTEGER,
  source TEXT,
  pdf_url TEXT,
  pdf_storage_path TEXT,
  abstract TEXT,
  key_insights TEXT[],
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_papers_status ON research_papers(status);
      `);
    } else {
      console.log("  ✓ research_papers table exists");
    }
  } else {
    console.log("  ✓ research_papers table created");
  }

  // 2. Create strategy_performance table
  console.log("\nCreating strategy_performance table...");
  const { error: perfError } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS strategy_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
        alpha FLOAT DEFAULT 1,
        beta FLOAT DEFAULT 1,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        total_pnl FLOAT DEFAULT 0,
        sharpe_ratio FLOAT,
        max_drawdown FLOAT,
        current_weight FLOAT DEFAULT 0.1,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(strategy_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_strategy_performance_strategy ON strategy_performance(strategy_id);
    `,
  });

  if (perfError) {
    const { error: checkError } = await supabase
      .from("strategy_performance")
      .select("id")
      .limit(1);
    
    if (checkError && checkError.code === "42P01") {
      console.log("  Note: Run this SQL in Supabase dashboard:\n");
      console.log(`
CREATE TABLE IF NOT EXISTS strategy_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  alpha FLOAT DEFAULT 1,
  beta FLOAT DEFAULT 1,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  total_pnl FLOAT DEFAULT 0,
  sharpe_ratio FLOAT,
  max_drawdown FLOAT,
  current_weight FLOAT DEFAULT 0.1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(strategy_id)
);

CREATE INDEX IF NOT EXISTS idx_strategy_performance_strategy ON strategy_performance(strategy_id);
      `);
    } else {
      console.log("  ✓ strategy_performance table exists");
    }
  } else {
    console.log("  ✓ strategy_performance table created");
  }

  // 3. Add paper_id column to strategies table
  console.log("\nAdding paper_id to strategies table...");
  const { error: alterError } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE strategies ADD COLUMN IF NOT EXISTS paper_id UUID REFERENCES research_papers(id);
    `,
  });

  if (alterError) {
    console.log("  Note: Run this SQL in Supabase dashboard:\n");
    console.log(`
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS paper_id UUID REFERENCES research_papers(id);
    `);
  } else {
    console.log("  ✓ paper_id column added to strategies");
  }

  // 4. Initialize performance records for existing strategies
  console.log("\nInitializing performance records for existing strategies...");
  
  const { data: strategies, error: fetchError } = await supabase
    .from("strategies")
    .select("id")
    .eq("status", "deployed");

  if (fetchError) {
    console.log("  Error fetching strategies:", fetchError.message);
  } else if (strategies && strategies.length > 0) {
    let initialized = 0;
    for (const strategy of strategies) {
      // Check if performance record exists
      const { data: existing } = await supabase
        .from("strategy_performance")
        .select("id")
        .eq("strategy_id", strategy.id)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
          .from("strategy_performance")
          .insert({
            strategy_id: strategy.id,
            alpha: 1,
            beta: 1,
            current_weight: 1 / strategies.length, // Equal initial allocation
          });

        if (!insertError) initialized++;
      }
    }
    console.log(`  ✓ Initialized ${initialized} performance records`);
  }

  console.log("\n✅ Migration complete!");
  console.log("\nIf any tables failed to create, copy the SQL above and run it in the Supabase SQL Editor.");
}

migrate().catch(console.error);
