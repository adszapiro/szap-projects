-- Add parent_id column to track strategy lineage (evolution)
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES strategies(id);

-- Index for efficient lineage queries
CREATE INDEX IF NOT EXISTS idx_strategies_parent_id ON strategies(parent_id);
