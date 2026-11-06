-- Safety protocol: every level 1–2 trigger is logged for error analysis.
-- No text is stored: only who, which level, what kind of request, and when.
CREATE TABLE safety_events (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level      INTEGER NOT NULL,
  scope      TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX safety_events_user ON safety_events(user_id, created_at);
