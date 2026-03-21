-- FindMyTribe Supabase Schema
-- Run this migration against your Supabase project via the SQL Editor.

-- ============================================================
-- 1. PROFILES — attendee profiles (seeded from mock_data.json)
-- ============================================================
CREATE TABLE profiles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL,
    company     TEXT NOT NULL,
    bio         TEXT NOT NULL,
    interests   TEXT[] NOT NULL DEFAULT '{}',
    twitter     TEXT,
    github      TEXT,
    goals       TEXT,
    past_events TEXT[],
    mutual_friend_ids TEXT[],
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Attendee profiles — one row per event participant.';

-- ============================================================
-- 2. LOCATIONS — current zone per attendee (upserted by POST /location/{user_id})
-- ============================================================
CREATE TABLE locations (
    user_id    TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    zone       TEXT NOT NULL CHECK (zone IN ('entrance', 'main_hall', 'workshop', 'chill_zone', 'outside')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE locations IS 'Real-time attendee locations — one row per attendee, upserted on zone change.';

-- Ensure realtime delivers both old and new row on UPDATE,
-- so subscribers can diff old zone → new zone for zone-entry detection.
ALTER TABLE locations REPLICA IDENTITY FULL;

-- ============================================================
-- 3. TRIBE_LIST — AI match results (upserted by POST /match/{user_id})
-- ============================================================
CREATE TABLE tribe_list (
    user_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    match_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score          INTEGER NOT NULL,
    reason         TEXT NOT NULL,
    talking_points TEXT[] NOT NULL DEFAULT '{}',
    match_type     TEXT NOT NULL,
    source         TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, match_id)
);

COMMENT ON TABLE tribe_list IS 'AI-generated match results — top tribe matches per attendee.';

-- ============================================================
-- AUTO-UPDATE updated_at ON UPSERT
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

-- Fast lookup of all matches for a given user, ordered by score
CREATE INDEX idx_tribe_list_user_score ON tribe_list (user_id, score DESC);

-- Look up matches where a user appears as the matched party
CREATE INDEX idx_tribe_list_match_id ON tribe_list (match_id);

-- Filter locations by zone (useful for host dashboard zone counts)
CREATE INDEX idx_locations_zone ON locations (zone);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_list ENABLE ROW LEVEL SECURITY;

-- Permissive read policies — all authenticated (and anon) users can read
CREATE POLICY "Allow public read on profiles"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Allow public read on locations"
    ON locations FOR SELECT
    USING (true);

CREATE POLICY "Allow public read on tribe_list"
    ON tribe_list FOR SELECT
    USING (true);

-- Permissive write policies — the backend uses the service key so RLS is
-- bypassed for writes, but these policies keep the door open for client-side
-- writes if needed in the future.
CREATE POLICY "Allow insert on profiles"
    ON profiles FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update on profiles"
    ON profiles FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow insert on locations"
    ON locations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update on locations"
    ON locations FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow insert on tribe_list"
    ON tribe_list FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update on tribe_list"
    ON tribe_list FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- SUPABASE REALTIME
-- ============================================================

-- Enable realtime broadcasts on the locations table so the frontend
-- can subscribe to zone changes via Supabase client.
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
