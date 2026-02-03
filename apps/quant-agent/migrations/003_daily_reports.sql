-- Daily Reports Table
-- Stores end-of-day summaries for the trading agent

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  portfolio_value NUMERIC NOT NULL,
  cash_balance NUMERIC NOT NULL,
  total_pnl NUMERIC NOT NULL,
  day_pnl NUMERIC NOT NULL,
  day_pnl_percent NUMERIC NOT NULL,
  total_trades INTEGER NOT NULL,
  winning_trades INTEGER NOT NULL,
  losing_trades INTEGER NOT NULL,
  win_rate NUMERIC NOT NULL,
  best_trade JSONB,
  worst_trade JSONB,
  top_strategy JSONB,
  asset_breakdown JSONB NOT NULL,
  convergence_score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date DESC);

-- Grant access
GRANT ALL ON daily_reports TO authenticated;
GRANT ALL ON daily_reports TO service_role;
