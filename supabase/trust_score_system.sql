-- Run this in Supabase SQL Editor

-- 1. Default trust score for new users
ALTER TABLE users ALTER COLUMN trust_score SET DEFAULT 40;

-- 2. RPC to safely increment trust score (capped at 100)
CREATE OR REPLACE FUNCTION increment_trust_score(
  user_id UUID,
  points INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET trust_score = LEAST(trust_score + points, 100)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_trust_score TO authenticated, anon;
