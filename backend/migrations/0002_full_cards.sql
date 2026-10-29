-- CP-003 additive control tables only. No changes to existing cards or owners.
CREATE TABLE mcp_word_tasks (
 task_id TEXT PRIMARY KEY, owner_token_hash TEXT NOT NULL, request_id TEXT NOT NULL,
 dictionary_id TEXT NOT NULL, digest TEXT NOT NULL, words_json TEXT NOT NULL, generation_signature TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'queued', result_json TEXT, created_at INTEGER NOT NULL,
 UNIQUE(owner_token_hash,request_id)
);
CREATE TABLE mcp_word_panels (
 task_id TEXT NOT NULL, owner_token_hash TEXT NOT NULL, word_key TEXT NOT NULL,
 mode TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'queued', response_id TEXT,
 payload_json TEXT, error_code TEXT, claimed_at INTEGER, next_check_at INTEGER,
 lease TEXT, attempts INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(task_id,word_key,mode)
);
CREATE UNIQUE INDEX mcp_one_active_panel_per_owner ON mcp_word_panels(owner_token_hash)
 WHERE state IN ('submitting','waiting');
CREATE TABLE mcp_generation_budget (
 owner_token_hash TEXT NOT NULL, day INTEGER NOT NULL, calls INTEGER NOT NULL,
 PRIMARY KEY(owner_token_hash,day)
);
CREATE TABLE mcp_delete_confirmations (
 token_hash TEXT PRIMARY KEY, owner_token_hash TEXT NOT NULL, kind TEXT NOT NULL,
 dictionary_id TEXT NOT NULL, word_id TEXT NOT NULL, snapshot TEXT NOT NULL,
 expires_at INTEGER NOT NULL, consumed_at INTEGER, execution TEXT
);
