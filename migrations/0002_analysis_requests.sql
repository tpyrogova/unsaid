-- Per-user analysis log for rate limiting. Stores no text, only timestamps.
CREATE TABLE analysis_requests (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX analysis_requests_user ON analysis_requests(user_id, created_at);
