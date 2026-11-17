-- ═══════════════════════════════════════════════════════════════════
--  KRISHI SARTHI — BIHAR EDITION (PRODUCTION MIGRATION 001)
--  Comprehensive Relational Schema with Row-Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════════════════════
-- 1. CROPS MASTER TABLE
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_hi VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('cereal', 'pulse', 'oilseed', 'horticulture', 'cash_crop', 'commercial')),
    typical_seasons TEXT[] NOT NULL DEFAULT '{"kharif", "rabi"}',
    is_bihar_specialty BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Crops
INSERT INTO crops (code, name_hi, name_en, category, typical_seasons, is_bihar_specialty) VALUES
('Makhana', 'मखाना', 'Fox Nut / Gorgon Nut', 'commercial', '{"zaid", "kharif"}', true),
('Dhan', 'धान', 'Paddy / Rice', 'cereal', '{"kharif"}', false),
('Makka', 'मक्का', 'Maize / Corn', 'cereal', '{"kharif", "rabi", "zaid"}', true),
('Gehun', 'गेहूं', 'Wheat', 'cereal', '{"rabi"}', false),
('Sarson', 'सरसों', 'Mustard', 'oilseed', '{"rabi"}', false),
('Litchi', 'शाही लीची', 'Shahi Litchi', 'horticulture', '{"zaid"}', true),
('Aam', 'जर्दालू आम', 'Zardalu Mango', 'horticulture', '{"zaid"}', true),
('Chana', 'चना', 'Bengal Gram / Chickpea', 'pulse', '{"rabi"}', false),
('Sabzi', 'सब्जी', 'Seasonal Vegetables', 'horticulture', '{"kharif", "rabi", "zaid"}', false)
ON CONFLICT (code) DO NOTHING;

-- ══════════════════════════════════════════════════════════
-- 2. FARMERS TABLE (PROFILES)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS farmers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supabase_auth_id UUID UNIQUE, -- Link to Supabase Auth auth.users
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(30) DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin', 'department_official', 'agronomist')),
    district VARCHAR(100) NOT NULL,
    block VARCHAR(100) NOT NULL,
    village VARCHAR(150),
    land_size_kattha DECIMAL(10,2) NOT NULL DEFAULT 0,
    land_size_bigha DECIMAL(10,3) GENERATED ALWAYS AS (land_size_kattha / 20) STORED,
    farmer_category VARCHAR(50) DEFAULT 'small' CHECK (farmer_category IN ('marginal', 'small', 'medium', 'large')),
    primary_crop VARCHAR(50) NOT NULL DEFAULT 'Dhan',
    phone_verified BOOLEAN DEFAULT false,
    profile_completed BOOLEAN DEFAULT false,
    profile_completed_at TIMESTAMP WITH TIME ZONE,
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- 3. FARMER CROPS (NORMALIZED MULTI-CROP TABLE)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS farmer_crops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    crop_code VARCHAR(50) NOT NULL REFERENCES crops(code) ON DELETE RESTRICT,
    area_kattha DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    season VARCHAR(30) DEFAULT 'kharif' CHECK (season IN ('kharif', 'rabi', 'zaid', 'perennial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(farmer_id, crop_code, season)
);

-- ══════════════════════════════════════════════════════════
-- 4. SCHEMES MASTER TABLE
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS schemes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    official_title_hi VARCHAR(255) NOT NULL,
    department VARCHAR(200) NOT NULL DEFAULT 'कृषि विभाग, बिहार सरकार (Dept. of Agriculture, Bihar)',
    description TEXT NOT NULL,
    benefits_summary TEXT NOT NULL,
    benefit_amount DECIMAL(12,2),
    scheme_type VARCHAR(50) DEFAULT 'state' CHECK (scheme_type IN ('central', 'state', 'district', 'joint')),
    source_url TEXT NOT NULL,
    notification_ref VARCHAR(100),
    verification_status VARCHAR(50) DEFAULT 'verified' CHECK (verification_status IN ('verified', 'under_review', 'expired')),
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    application_deadline DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- 5. SCHEME ELIGIBILITY RULES TABLE (DYNAMIC ENGINE)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS scheme_eligibility_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    eligible_districts TEXT[] NOT NULL DEFAULT '{"ALL"}',
    eligible_blocks TEXT[] DEFAULT '{"ALL"}',
    min_land_kattha DECIMAL(10,2) DEFAULT 0,
    max_land_kattha DECIMAL(10,2),
    eligible_crops TEXT[] DEFAULT '{"ALL"}',
    farmer_categories TEXT[] DEFAULT '{"marginal", "small", "medium", "large"}',
    max_income_annual DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- 6. SCHEME DOCUMENTS TABLE
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS scheme_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
    document_name VARCHAR(150) NOT NULL,
    is_mandatory BOOLEAN DEFAULT true,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- 7. SCHEME APPLICATIONS (INTEREST / TRACKING)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS scheme_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'interest_registered' CHECK (status IN ('interest_registered', 'form_filled', 'documents_pending', 'submitted_to_portal', 'approved', 'rejected')),
    tracking_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- 8. DISEASE DETECTIONS TABLE
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS disease_detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    storage_path TEXT,
    disease_name VARCHAR(255),
    confidence_score DECIMAL(5,2),
    severity VARCHAR(50) DEFAULT 'unknown' CHECK (severity IN ('low', 'medium', 'high', 'critical', 'healthy', 'unknown')),
    model_version VARCHAR(50) DEFAULT 'gemini-1.5-flash-agri-v1',
    cure_chemical TEXT,
    cure_organic TEXT,
    prevention_tips TEXT,
    expert_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES farmers(id),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- 9. AI CHAT SESSIONS & MESSAGES (RAG ARCHITECTURE)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    title VARCHAR(200) DEFAULT 'नई कृषि चर्चा (New Agri Chat)',
    language VARCHAR(20) DEFAULT 'hi',
    crop_context VARCHAR(100),
    district_context VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    source_references JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- 10. AGRICULTURAL ADVISORIES (ADMIN / DEPARTMENT BULLETINS)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agricultural_advisories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    department_issuer VARCHAR(200) DEFAULT 'कृषि प्रौद्योगिकी प्रबंध अभिकरण (ATMA), बिहार',
    category VARCHAR(50) CHECK (category IN ('weather_warning', 'pest_alert', 'subsidy_announcement', 'sowing_guidance', 'mandi_notice')),
    target_districts TEXT[] NOT NULL DEFAULT '{"ALL"}',
    target_crops TEXT[] DEFAULT '{"ALL"}',
    severity VARCHAR(20) DEFAULT 'normal' CHECK (severity IN ('info', 'normal', 'urgent', 'emergency')),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES farmers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- 11. PASSWORD RESETS
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════
-- 12. PERFORMANCE INDEXES
-- ══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
CREATE INDEX IF NOT EXISTS idx_farmers_email ON farmers(email);
CREATE INDEX IF NOT EXISTS idx_farmers_district ON farmers(district);
CREATE INDEX IF NOT EXISTS idx_farmers_role ON farmers(role);
CREATE INDEX IF NOT EXISTS idx_farmer_crops_farmer_id ON farmer_crops(farmer_id);
CREATE INDEX IF NOT EXISTS idx_schemes_active ON schemes(is_active);
CREATE INDEX IF NOT EXISTS idx_scheme_eligibility_districts ON scheme_eligibility_rules USING GIN(eligible_districts);
CREATE INDEX IF NOT EXISTS idx_disease_detections_farmer_id ON disease_detections(farmer_id);
CREATE INDEX IF NOT EXISTS idx_disease_detections_status ON disease_detections(status);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_advisories_districts ON agricultural_advisories USING GIN(target_districts);

-- ══════════════════════════════════════════════════════════
-- 13. AUTO-UPDATE UPDATED_AT TRIGGER
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_farmers_updated_at BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_schemes_updated_at BEFORE UPDATE ON schemes FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_disease_detections_updated_at BEFORE UPDATE ON disease_detections FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_ai_chat_sessions_updated_at BEFORE UPDATE ON ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ══════════════════════════════════════════════════════════
-- 14. ROW-LEVEL SECURITY (RLS) POLICIES
-- ══════════════════════════════════════════════════════════
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agricultural_advisories ENABLE ROW LEVEL SECURITY;

-- Schemes and advisories are readable by all authenticated or anon users
CREATE POLICY "Public read active schemes" ON schemes FOR SELECT USING (is_active = true);
CREATE POLICY "Public read scheme rules" ON scheme_eligibility_rules FOR SELECT USING (true);
CREATE POLICY "Public read scheme documents" ON scheme_documents FOR SELECT USING (true);
CREATE POLICY "Public read advisories" ON agricultural_advisories FOR SELECT USING (true);
CREATE POLICY "Public read crops" ON crops FOR SELECT USING (true);

-- Farmers can only access their own profile and records
CREATE POLICY "Farmers select own profile" ON farmers FOR SELECT USING (auth.uid() = supabase_auth_id OR id::text = auth.jwt() ->> 'sub');
CREATE POLICY "Farmers update own profile" ON farmers FOR UPDATE USING (auth.uid() = supabase_auth_id OR id::text = auth.jwt() ->> 'sub');
CREATE POLICY "Farmers access own crops" ON farmer_crops FOR ALL USING (farmer_id::text = auth.jwt() ->> 'sub' OR farmer_id IN (SELECT id FROM farmers WHERE supabase_auth_id = auth.uid()));
CREATE POLICY "Farmers access own detections" ON disease_detections FOR ALL USING (farmer_id::text = auth.jwt() ->> 'sub' OR farmer_id IN (SELECT id FROM farmers WHERE supabase_auth_id = auth.uid()));
CREATE POLICY "Farmers access own chats" ON ai_chat_sessions FOR ALL USING (farmer_id::text = auth.jwt() ->> 'sub' OR farmer_id IN (SELECT id FROM farmers WHERE supabase_auth_id = auth.uid()));
CREATE POLICY "Farmers access own messages" ON ai_chat_messages FOR ALL USING (farmer_id::text = auth.jwt() ->> 'sub' OR farmer_id IN (SELECT id FROM farmers WHERE supabase_auth_id = auth.uid()));
CREATE POLICY "Farmers access own applications" ON scheme_applications FOR ALL USING (farmer_id::text = auth.jwt() ->> 'sub' OR farmer_id IN (SELECT id FROM farmers WHERE supabase_auth_id = auth.uid()));
