-- CP-002: additive only. Existing dictionary fields and records are preserved.
ALTER TABLE dictionary_words ADD COLUMN normalized_word TEXT;
ALTER TABLE dictionary_words ADD COLUMN search_text TEXT;
CREATE UNIQUE INDEX idx_dictionary_words_normalized
  ON dictionary_words(dictionary_id, normalized_word) WHERE normalized_word IS NOT NULL;

CREATE TABLE mcp_operations (
  owner_token_hash TEXT NOT NULL,
  request_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  digest TEXT NOT NULL,
  result_json TEXT NOT NULL CHECK (json_extract(result_json, '$.ok') = 1),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(owner_token_hash, request_id)
);
CREATE TABLE mcp_oauth_clients (
  client_id TEXT PRIMARY KEY,
  redirect_uris TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE mcp_oauth_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  owner_token_hash TEXT NOT NULL,
  scope TEXT NOT NULL,
  challenge TEXT NOT NULL,
  resource TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE TABLE mcp_oauth_grants (
  grant_id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  owner_token_hash TEXT NOT NULL,
  scope TEXT NOT NULL,
  resource TEXT NOT NULL,
  access_hash TEXT NOT NULL UNIQUE,
  refresh_hash TEXT NOT NULL UNIQUE,
  access_expires_at INTEGER NOT NULL,
  refresh_expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE mcp_used_refresh (
  token_hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL
);
CREATE TABLE mcp_rate_limits (
  bucket TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  hits INTEGER NOT NULL
);
