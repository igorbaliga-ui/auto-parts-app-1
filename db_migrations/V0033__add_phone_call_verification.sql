ALTER TABLE garage_accounts
  ADD COLUMN phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN phone_verified_at timestamptz NULL;

CREATE TABLE call_verifications (
  id serial PRIMARY KEY,
  phone_last10 varchar(10) NOT NULL,
  call_id bigint,
  expected_suffix varchar(4) NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

CREATE INDEX idx_call_verifications_phone_created
  ON call_verifications (phone_last10, created_at DESC);
