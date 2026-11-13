-- Intentos de login para rate limiting
CREATE TABLE IF NOT EXISTS auth_attempts (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  username TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_created
  ON auth_attempts (ip, created_at);
