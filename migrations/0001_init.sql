-- Unsaid schema. Journal content is stored only as client-side ciphertext.

CREATE TABLE users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  -- Public salt for the browser-side PBKDF2 (returned by /prelogin).
  kdf_salt       TEXT NOT NULL,
  -- SHA-256(auth_salt || authKey). authKey is itself derived from the password.
  auth_hash      TEXT NOT NULL,
  auth_salt      TEXT NOT NULL,
  -- Data encryption key, wrapped (AES-GCM) with a password-derived key.
  wrapped_dek    TEXT NOT NULL,
  wrapped_dek_iv TEXT NOT NULL,
  created_at     INTEGER NOT NULL
);

CREATE TABLE sessions (
  -- SHA-256 of the cookie token; the raw token is never stored.
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user_id ON sessions(user_id);

CREATE TABLE entries (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv         TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  -- Composite key makes re-importing the same export idempotent per user.
  PRIMARY KEY (user_id, id)
);

CREATE TABLE login_attempts (
  email        TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX login_attempts_email ON login_attempts(email, attempted_at);
