-- ============================================================
-- Migration 004 — API Keys (Personal Access Tokens)
-- ============================================================
-- Users can generate long-lived API keys (prefixed pfk_) to
-- authenticate MCP clients and other integrations. The raw key
-- is never stored — only its SHA-256 hash.
-- ============================================================

CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  key_hash      TEXT NOT NULL UNIQUE,
  key_prefix    TEXT NOT NULL,          -- e.g. "pfk_a1b2c3" for display
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own keys
CREATE POLICY "api_keys_select" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own keys
CREATE POLICY "api_keys_insert" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own keys
CREATE POLICY "api_keys_delete" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast hash lookups during auth
CREATE INDEX api_keys_key_hash_idx ON api_keys (key_hash);
CREATE INDEX api_keys_user_id_idx  ON api_keys (user_id);
