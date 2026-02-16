-- RL Position Sizer Q-table storage
CREATE TABLE IF NOT EXISTS rl_qtable (
  id TEXT PRIMARY KEY,
  q_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize the position sizer entry
INSERT INTO rl_qtable (id, q_data)
VALUES ('position_sizer', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
