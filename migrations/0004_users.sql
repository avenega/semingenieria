-- Multi-user CMS accounts
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Link sessions to users (existing anonymous sessions will be cleared on next login)
ALTER TABLE sessions ADD COLUMN user_id TEXT;
