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
  UNIQUE(symbol, status) -- Only one open position per symbol
);

-- Simulated account table for cash balance
CREATE TABLE IF NOT EXISTS simulated_account (
  id TEXT PRIMARY KEY, -- 'crypto' for crypto simulator
  cash NUMERIC NOT NULL DEFAULT 50000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_simulated_positions_status ON simulated_positions(status);
CREATE INDEX IF NOT EXISTS idx_simulated_positions_symbol ON simulated_positions(symbol);

-- Initialize crypto account if not exists
INSERT INTO simulated_account (id, cash) VALUES ('crypto', 50000) ON CONFLICT (id) DO NOTHING;
