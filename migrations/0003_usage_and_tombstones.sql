-- Generic per-user usage log for model rate limits (replaces analysis_requests).
-- Stores no text: only what kind of request, how many units, and when.
CREATE TABLE usage_log (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  units      INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX usage_log_user_kind ON usage_log(user_id, kind, created_at);

DROP TABLE analysis_requests;

-- Ids of entries the user deleted, so re-importing the same export does not
-- bring them back. Ids are opaque HMACs and reveal nothing about content.
CREATE TABLE deleted_entries (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
