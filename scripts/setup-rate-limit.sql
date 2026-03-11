-- Rate limiting table and function for walk-in availability protection.
-- Run this in Supabase SQL Editor.

-- Table to store rate limit counters
CREATE TABLE IF NOT EXISTS rate_limit_entries (
  key        TEXT        NOT NULL,
  count      INT         NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON rate_limit_entries (window_start);

-- Atomic rate limit check: upserts counter and returns whether the request is allowed.
-- Cleans up old entries for the same key automatically.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INT DEFAULT 15,
  p_window_seconds INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INT;
BEGIN
  -- Calculate window start (truncate to window boundary)
  v_window_start := date_trunc('second', now()) -
    (EXTRACT(EPOCH FROM now())::INT % p_window_seconds) * INTERVAL '1 second';

  -- Delete old entries for this key
  DELETE FROM rate_limit_entries
  WHERE key = p_key AND window_start < v_window_start;

  -- Upsert: increment or insert
  INSERT INTO rate_limit_entries (key, count, window_start)
  VALUES (p_key, 1, v_window_start)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limit_entries.count + 1
  RETURNING count INTO v_current_count;

  RETURN v_current_count <= p_max_requests;
END;
$$;

-- Global cleanup function (call from pg_cron or Vercel cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM rate_limit_entries
  WHERE window_start < now() - INTERVAL '5 minutes';
$$;
