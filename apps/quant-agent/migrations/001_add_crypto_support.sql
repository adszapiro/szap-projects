-- Migration: Add Crypto Support
-- Run this in Supabase SQL Editor to add crypto trading fields

-- Add asset class and symbols to strategies
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS asset_class TEXT DEFAULT 'stock';
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS symbols TEXT[] DEFAULT ARRAY['SPY'];

-- Add asset class to trades for filtering
ALTER TABLE agent_trades ADD COLUMN IF NOT EXISTS asset_class TEXT DEFAULT 'stock';

-- Add asset class to child learnings
ALTER TABLE child_learnings ADD COLUMN IF NOT EXISTS asset_class TEXT DEFAULT 'stock';

-- Index for filtering by asset class
CREATE INDEX IF NOT EXISTS idx_strategies_asset_class ON strategies(asset_class);
CREATE INDEX IF NOT EXISTS idx_trades_asset_class ON agent_trades(asset_class);
CREATE INDEX IF NOT EXISTS idx_learnings_asset_class ON child_learnings(asset_class);

-- Verify columns exist
SELECT 
  'strategies.asset_class' as column_name, 
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strategies' AND column_name = 'asset_class') as exists
UNION ALL
SELECT 
  'strategies.symbols', 
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strategies' AND column_name = 'symbols')
UNION ALL
SELECT 
  'agent_trades.asset_class', 
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_trades' AND column_name = 'asset_class');
