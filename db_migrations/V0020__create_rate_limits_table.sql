CREATE TABLE IF NOT EXISTS rate_limits (
    bucket_key varchar(255) PRIMARY KEY,
    window_start timestamptz NOT NULL DEFAULT now(),
    request_count integer NOT NULL DEFAULT 1
);