-- ═══════════════════════════════════════════════════════════════════
--  Migration 008: Pan-India Geography (LGD) + Farmer geo references
--  Source: Local Government Directory (lgdirectory.gov.in) open data
--  Adds geo lookup tables and nullable geo-code columns on farmers.
--  Existing farmer rows are NOT modified — all new columns are nullable.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Geography master tables ──
CREATE TABLE IF NOT EXISTS geo_states (
    state_code   INTEGER PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    is_ut        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_districts (
    district_code INTEGER PRIMARY KEY,
    state_code    INTEGER NOT NULL REFERENCES geo_states(state_code),
    name          VARCHAR(150) NOT NULL,
    census_2001   VARCHAR(20),
    census_2011   VARCHAR(20),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_geo_districts_state ON geo_districts(state_code);

CREATE TABLE IF NOT EXISTS geo_subdistricts (
    subdistrict_code INTEGER PRIMARY KEY,
    district_code    INTEGER NOT NULL REFERENCES geo_districts(district_code),
    name             VARCHAR(150) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_geo_subdistricts_district ON geo_subdistricts(district_code);

CREATE TABLE IF NOT EXISTS geo_villages (
    village_code     INTEGER PRIMARY KEY,
    subdistrict_code INTEGER NOT NULL REFERENCES geo_subdistricts(subdistrict_code),
    district_code    INTEGER NOT NULL,
    state_code       INTEGER NOT NULL,
    name             VARCHAR(200) NOT NULL,
    local_name       VARCHAR(200),
    status           VARCHAR(30),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_geo_villages_subdistrict ON geo_villages(subdistrict_code);
CREATE INDEX IF NOT EXISTS idx_geo_villages_district ON geo_villages(district_code);
CREATE INDEX IF NOT EXISTS idx_geo_villages_name ON geo_villages USING gin (to_tsvector('simple', name));

-- ── 2. Farmer geo reference columns (all nullable — non-breaking) ──
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS state           VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS state_code      INTEGER;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS district_code   INTEGER;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS subdistrict_code INTEGER;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS village_code    INTEGER;

CREATE INDEX IF NOT EXISTS idx_farmers_state_code ON farmers(state_code);
CREATE INDEX IF NOT EXISTS idx_farmers_district_code ON farmers(district_code);

-- ── 3. RLS — geography is public reference data ──
ALTER TABLE geo_states       ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_districts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_subdistricts ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_villages     ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'geo_states' AND policyname = 'geo_states_public_read') THEN
        CREATE POLICY geo_states_public_read ON geo_states FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'geo_districts' AND policyname = 'geo_districts_public_read') THEN
        CREATE POLICY geo_districts_public_read ON geo_districts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'geo_subdistricts' AND policyname = 'geo_subdistricts_public_read') THEN
        CREATE POLICY geo_subdistricts_public_read ON geo_subdistricts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'geo_villages' AND policyname = 'geo_villages_public_read') THEN
        CREATE POLICY geo_villages_public_read ON geo_villages FOR SELECT USING (true);
    END IF;
END $$;

-- NOTE: Seed data is loaded by scripts/seed-lgd.js (not inline SQL —
-- the village table has ~662k rows and is too large for the SQL editor).
SELECT 'Migration 008 complete — run scripts/seed-lgd.js to load LGD data' AS status;
