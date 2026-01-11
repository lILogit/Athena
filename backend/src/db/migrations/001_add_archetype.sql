-- Migration: Add archetype support to graphs table
-- Run this manually for existing databases

-- Add archetype column with default value
ALTER TABLE graphs ADD COLUMN archetype TEXT NOT NULL DEFAULT 'general';

-- Add archetype_config column for archetype-specific settings
ALTER TABLE graphs ADD COLUMN archetype_config TEXT DEFAULT '{}';

-- Create index for filtering by archetype
CREATE INDEX IF NOT EXISTS idx_graphs_archetype ON graphs(archetype);

-- Update existing rows to ensure they have the default archetype
UPDATE graphs SET archetype = 'general' WHERE archetype IS NULL OR archetype = '';
