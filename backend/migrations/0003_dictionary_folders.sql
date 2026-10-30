-- CP-004: additive organization only. No dictionary/card/Inbox rows rewritten.
CREATE UNIQUE INDEX dictionary_owner_identity ON dictionaries(id,owner_token_hash);
CREATE TABLE dictionary_folders (
 id TEXT PRIMARY KEY, owner_token_hash TEXT NOT NULL, parent_folder_id TEXT,
 title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(owner_token_hash,id),
 FOREIGN KEY(owner_token_hash,parent_folder_id) REFERENCES dictionary_folders(owner_token_hash,id)
);
CREATE INDEX dictionary_folder_parent ON dictionary_folders(owner_token_hash,parent_folder_id,position);
CREATE TABLE dictionary_locations (
 dictionary_id TEXT PRIMARY KEY, owner_token_hash TEXT NOT NULL, folder_id TEXT,
 position INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY(dictionary_id,owner_token_hash) REFERENCES dictionaries(id,owner_token_hash) ON DELETE CASCADE,
 FOREIGN KEY(owner_token_hash,folder_id) REFERENCES dictionary_folders(owner_token_hash,id)
);
CREATE INDEX dictionary_location_parent ON dictionary_locations(owner_token_hash,folder_id,position);
CREATE TABLE dictionary_tree_operations (
 owner_token_hash TEXT NOT NULL, request_id TEXT NOT NULL, digest TEXT NOT NULL,
 execution TEXT NOT NULL, result_json TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(owner_token_hash,request_id)
);
CREATE TABLE dictionary_folder_confirmations (
 token_hash TEXT PRIMARY KEY, owner_token_hash TEXT NOT NULL, items_json TEXT NOT NULL,
 snapshot TEXT NOT NULL, expires_at INTEGER NOT NULL, consumed_at INTEGER
);
