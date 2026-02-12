-- Quant Agent Database Schema
-- Run this in your Supabase SQL Editor

-- Strategies table - all generated strategies
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  source_model TEXT NOT NULL, -- 'claude', 'openai', 'consensus'
  status TEXT DEFAULT 'pending', -- 'pending', 'testing', 'approved', 'deployed', 'retired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backtest results
CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital DECIMAL(15,2) NOT NULL,
  final_capital DECIMAL(15,2) NOT NULL,
  total_return DECIMAL(10,4),
  sharpe_ratio DECIMAL(10,4),
  max_drawdown DECIMAL(10,4),
  win_rate DECIMAL(10,4),
  total_trades INTEGER,
  profit_factor DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper trades executed
CREATE TABLE IF NOT EXISTS agent_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES strategies(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL, -- 'buy', 'sell'
  qty DECIMAL(15,6) NOT NULL,
  price DECIMAL(15,4),
  order_id TEXT, -- Alpaca order ID
  status TEXT DEFAULT 'pending', -- 'pending', 'filled', 'cancelled', 'failed'
  pnl DECIMAL(15,4), -- Profit/loss after closing
  pnl_percent DECIMAL(10,4),
  reasoning TEXT, -- Why the agent made this trade
  created_at TIMESTAMPTZ DEFAULT NOW(),
  filled_at TIMESTAMPTZ
);

-- Model debates - full conversation logs
CREATE TABLE IF NOT EXISTS model_debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL, -- Groups messages in one debate
  role TEXT NOT NULL, -- 'claude', 'openai', 'system', 'consensus'
  content TEXT NOT NULL,
  context JSONB, -- Market data, patterns used, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Child model learnings - the distilled wisdom
CREATE TABLE IF NOT EXISTS child_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL, -- "RSI < 30 + volume spike = buy signal"
  context TEXT, -- "works in trending markets"
  category TEXT, -- 'entry', 'exit', 'risk', 'timing', 'indicator'
  source_model TEXT NOT NULL, -- 'claude', 'openai', 'consensus'
  confidence DECIMAL(5,4) DEFAULT 0.5, -- 0.0 to 1.0
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  last_validated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent logs - high-level agent actions
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'decision'
  action TEXT NOT NULL, -- 'strategy_generated', 'backtest_run', 'trade_executed', etc.
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily performance snapshots
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  portfolio_value DECIMAL(15,2),
  daily_pnl DECIMAL(15,4),
  daily_pnl_percent DECIMAL(10,4),
  total_pnl DECIMAL(15,4),
  total_pnl_percent DECIMAL(10,4),
  active_strategies INTEGER,
  trades_today INTEGER,
  win_rate_today DECIMAL(10,4),
  top_patterns JSONB, -- Best performing child learnings
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_strategies_status ON strategies(status);
CREATE INDEX IF NOT EXISTS idx_backtest_strategy ON backtest_results(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_strategy ON agent_trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_created ON agent_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_debates_session ON model_debates(session_id);
CREATE INDEX IF NOT EXISTS idx_learnings_confidence ON child_learnings(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_logs_created ON agent_logs(created_at);

-- Enable Row Level Security (but allow all for now since this is server-side)
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies: anon key gets read-only, service key bypasses RLS entirely
CREATE POLICY "anon_read_strategies" ON strategies FOR SELECT USING (true);
CREATE POLICY "anon_read_backtest_results" ON backtest_results FOR SELECT USING (true);
CREATE POLICY "anon_read_agent_trades" ON agent_trades FOR SELECT USING (true);
CREATE POLICY "anon_read_model_debates" ON model_debates FOR SELECT USING (true);
CREATE POLICY "anon_read_child_learnings" ON child_learnings FOR SELECT USING (true);
CREATE POLICY "anon_read_agent_logs" ON agent_logs FOR SELECT USING (true);
CREATE POLICY "anon_read_daily_snapshots" ON daily_snapshots FOR SELECT USING (true);

-- =====================
-- CRYPTO SUPPORT (v1.1)
-- =====================
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
