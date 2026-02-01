-- Users table for login-first onboarding (Google OAuth tracking/audit)
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  provider TEXT NOT NULL DEFAULT 'google',
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
