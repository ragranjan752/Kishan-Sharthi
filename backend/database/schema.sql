-- ═══════════════════════════════════════════════
--  KRISHI SARTHI — BIHAR EDITION
--  SUPABASE POSTGRESQL SCHEMA (Enhanced)
--  Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- ══════════════════════════════════════
--  1. FARMERS TABLE
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS farmers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    block VARCHAR(100) NOT NULL,
    land_size_kattha DECIMAL(10,2) NOT NULL,
    land_size_bigha DECIMAL(10,2) GENERATED ALWAYS AS (land_size_kattha / 20) STORED,
    primary_crop VARCHAR(50) NOT NULL CHECK (primary_crop IN ('Makhana', 'Dhan', 'Makka', 'Gehun', 'Sarson', 'Sabzi')),
    phone_verified BOOLEAN DEFAULT false,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════
--  2. SCHEMES TABLE
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS schemes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    scheme_type VARCHAR(50) DEFAULT 'state' CHECK (scheme_type IN ('central', 'state', 'district')),
    eligible_districts TEXT[] NOT NULL,
    min_land_size_kattha DECIMAL(10,2) DEFAULT 0,
    max_land_size_kattha DECIMAL(10,2),
    primary_crop_filter VARCHAR(50),
    benefit_amount DECIMAL(12,2),
    application_url TEXT,
    documents_required TEXT[],
    application_deadline DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════
--  3. DISEASE DETECTIONS TABLE
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    disease_name VARCHAR(255),
    confidence_score DECIMAL(5,2),
    severity VARCHAR(50) DEFAULT 'unknown' CHECK (severity IN ('low', 'medium', 'high', 'critical', 'healthy', 'unknown')),
    cure_suggestion TEXT,
    prevention_tip TEXT,
    ai_analysis TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════
--  4. CHAT HISTORY TABLE
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    category VARCHAR(50),
    language VARCHAR(10) DEFAULT 'hi',
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ══════════════════════════════════════
--  5. NOTIFICATIONS TABLE (for Firebase Push)
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general' CHECK (type IN ('general', 'scheme', 'weather', 'disease', 'mandi')),
    is_read BOOLEAN DEFAULT false,
    fcm_token TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ══════════════════════════════════════
--  INDEXES FOR PERFORMANCE
-- ══════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
CREATE INDEX IF NOT EXISTS idx_farmers_district ON farmers(district);
CREATE INDEX IF NOT EXISTS idx_farmers_primary_crop ON farmers(primary_crop);
CREATE INDEX IF NOT EXISTS idx_schemes_districts ON schemes USING GIN(eligible_districts);
CREATE INDEX IF NOT EXISTS idx_schemes_active ON schemes(is_active);
CREATE INDEX IF NOT EXISTS idx_schemes_type ON schemes(scheme_type);
CREATE INDEX IF NOT EXISTS idx_detections_farmer_id ON detections(farmer_id);
CREATE INDEX IF NOT EXISTS idx_detections_status ON detections(status);
CREATE INDEX IF NOT EXISTS idx_chat_history_farmer_id ON chat_history(farmer_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_farmer_id ON notifications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(farmer_id, is_read) WHERE is_read = false;


-- ══════════════════════════════════════
--  TRIGGER: Auto-update updated_at
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_farmers_updated_at ON farmers;
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schemes_updated_at ON schemes;
CREATE TRIGGER update_schemes_updated_at BEFORE UPDATE ON schemes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_detections_updated_at ON detections;
CREATE TRIGGER update_detections_updated_at BEFORE UPDATE ON detections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ══════════════════════════════════════
--  SEED DATA — Bihar Schemes
-- ══════════════════════════════════════

-- Clear existing seed data (safe for re-runs)
DELETE FROM schemes WHERE name IN (
    'दरभंगा मखाना विशेष सब्सिडी',
    'पटना डीजल अनुदान',
    'धान कृषि सहायता योजना',
    'मक्का विकास प्रोत्साहन',
    'बिहार कृषि इनपुट अनुदान',
    'मुख्यमंत्री कृषि आशीर्वाद योजना',
    'PM-KISAN सम्मान निधि',
    'PM फसल बीमा योजना (PMFBY)',
    'किसान क्रेडिट कार्ड (KCC)',
    'मुजफ्फरपुर लीची विकास योजना',
    'भागलपुर रेशम उद्योग सहायता'
);

INSERT INTO schemes (name, description, scheme_type, eligible_districts, min_land_size_kattha, max_land_size_kattha, primary_crop_filter, benefit_amount, application_url, documents_required) VALUES

-- District-specific schemes
('दरभंगा मखाना विशेष सब्सिडी',
 'दरभंगा क्षेत्र के मखाना किसानों के लिए विशेष सब्सिडी योजना। मखाना की खेती, प्रसंस्करण और विपणन के लिए आर्थिक सहायता।',
 'district',
 ARRAY['Darbhanga', 'Madhubani', 'Sitamarhi', 'Samastipur'],
 10, 1000, 'Makhana', 25000.00,
 'https://dbtagriculture.bihar.gov.in',
 ARRAY['आधार कार्ड', 'जमीन के कागजात', 'बैंक पासबुक', 'मखाना खेती का प्रमाण']
),

('पटना डीजल अनुदान',
 'पटना जिले के किसानों के लिए सिंचाई हेतु डीजल अनुदान। खरीफ और रबी दोनों मौसमों में लागू।',
 'district',
 ARRAY['Patna', 'Nalanda', 'Vaishali'],
 5, 500, NULL, 8000.00,
 'https://dbtagriculture.bihar.gov.in',
 ARRAY['आधार कार्ड', 'जमीन के कागजात', 'डीजल रसीद']
),

('धान कृषि सहायता योजना',
 'बिहार के धान उत्पादक जिलों में धान की खेती के लिए इनपुट सब्सिडी। बीज, खाद और कीटनाशक पर सहायता।',
 'state',
 ARRAY['Bhojpur', 'Rohtas', 'Kaimur', 'Buxar', 'Begusarai', 'Khagaria'],
 20, 2000, 'Dhan', 12000.00,
 'https://dbtagriculture.bihar.gov.in',
 ARRAY['आधार कार्ड', 'जमीन के कागजात', 'बैंक पासबुक']
),

('मक्का विकास प्रोत्साहन',
 'बिहार में मक्का उत्पादन बढ़ाने के लिए विशेष योजना। हाइब्रिड बीज, खाद और तकनीकी सहायता।',
 'state',
 ARRAY['Nalanda', 'Gaya', 'Aurangabad', 'Katihar', 'Purnia'],
 15, 1500, 'Makka', 10000.00,
 'https://dbtagriculture.bihar.gov.in',
 ARRAY['आधार कार्ड', 'जमीन के कागजात', 'बैंक पासबुक']
),

('बिहार कृषि इनपुट अनुदान',
 'प्राकृतिक आपदा (बाढ़, सूखा, ओलावृष्टि) से प्रभावित किसानों को इनपुट अनुदान। असिंचित फसल ₹6,800/हेक्टेयर, सिंचित ₹13,500/हेक्टेयर।',
 'state',
 ARRAY['Patna', 'Darbhanga', 'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Nalanda', 'Vaishali', 'Samastipur', 'Begusarai', 'Munger'],
 5, NULL, NULL, 13500.00,
 'https://dbtagriculture.bihar.gov.in',
 ARRAY['आधार कार्ड', 'जमीन के कागजात', 'बैंक पासबुक', 'आपदा प्रमाण पत्र']
),

('मुख्यमंत्री कृषि आशीर्वाद योजना',
 'बिहार के छोटे और सीमांत किसानों को प्रति एकड़ ₹5,000 की सहायता। 2 एकड़ तक की जमीन वाले किसान पात्र।',
 'state',
 ARRAY['Patna', 'Darbhanga', 'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Nalanda', 'Vaishali', 'Samastipur', 'Begusarai', 'Munger', 'Rohtas', 'Bhojpur', 'Kaimur', 'Buxar', 'Madhubani', 'Sitamarhi', 'Purnia', 'Katihar', 'Aurangabad', 'Nawada', 'Jehanabad', 'Arwal', 'Sheikhpura', 'Lakhisarai', 'Jamui', 'Banka', 'Khagaria', 'Saharsa', 'Supaul', 'Madhepura', 'Araria', 'Kishanganj', 'West Champaran', 'East Champaran', 'Gopalganj', 'Siwan', 'Saran', 'Sheohar'],
 1, 40, NULL, 5000.00,
 'https://dbtagriculture.bihar.gov.in',
 ARRAY['आधार कार्ड', 'जमीन के कागजात (2 एकड़ से कम)', 'बैंक पासबुक']
),

-- Central schemes applicable in Bihar
('PM-KISAN सम्मान निधि',
 'सभी भूधारक किसान परिवारों को ₹6,000/वर्ष की सीधी आय सहायता। 3 बराबर किस्तों में ₹2,000 प्रत्येक।',
 'central',
 ARRAY['Patna', 'Darbhanga', 'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Nalanda', 'Vaishali', 'Samastipur', 'Begusarai', 'Munger', 'Rohtas', 'Bhojpur', 'Kaimur', 'Buxar', 'Madhubani', 'Sitamarhi', 'Purnia', 'Katihar', 'Aurangabad', 'Nawada', 'Jehanabad', 'Arwal', 'Sheikhpura', 'Lakhisarai', 'Jamui', 'Banka', 'Khagaria', 'Saharsa', 'Supaul', 'Madhepura', 'Araria', 'Kishanganj', 'West Champaran', 'East Champaran', 'Gopalganj', 'Siwan', 'Saran', 'Sheohar'],
 1, NULL, NULL, 6000.00,
 'https://pmkisan.gov.in',
 ARRAY['आधार कार्ड', 'बैंक पासबुक', 'जमीन के कागजात']
),

('PM फसल बीमा योजना (PMFBY)',
 'खरीफ 2% और रबी 1.5% प्रीमियम पर व्यापक फसल बीमा। उपज हानि, बुवाई रोक, और स्थानीय आपदाओं को कवर करती है।',
 'central',
 ARRAY['Patna', 'Darbhanga', 'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Nalanda', 'Vaishali', 'Samastipur', 'Begusarai', 'Munger', 'Rohtas', 'Bhojpur', 'Kaimur', 'Buxar', 'Madhubani', 'Sitamarhi', 'Purnia', 'Katihar', 'Aurangabad'],
 1, NULL, NULL, 200000.00,
 'https://pmfby.gov.in',
 ARRAY['आधार कार्ड', 'जमीन के कागजात', 'बैंक पासबुक', 'बुवाई प्रमाण पत्र']
),

('किसान क्रेडिट कार्ड (KCC)',
 '4% ब्याज दर पर कृषि ऋण। फसल उत्पादन, कटाई के बाद खर्च, और पशुपालन के लिए।',
 'central',
 ARRAY['Patna', 'Darbhanga', 'Muzaffarpur', 'Bhagalpur', 'Gaya', 'Nalanda', 'Vaishali', 'Samastipur', 'Begusarai', 'Munger', 'Rohtas', 'Bhojpur', 'Kaimur', 'Buxar', 'Madhubani', 'Sitamarhi', 'Purnia', 'Katihar', 'Aurangabad'],
 1, NULL, NULL, 300000.00,
 'https://pmkisan.gov.in/KCC',
 ARRAY['आधार कार्ड', 'जमीन के कागजात', 'बैंक पासबुक', 'पासपोर्ट फोटो']
),

-- Special district schemes
('मुजफ्फरपुर लीची विकास योजना',
 'मुजफ्फरपुर और आसपास के जिलों में लीची बागवानी के लिए विशेष सहायता। नए बाग लगाने पर ₹20,000/हेक्टेयर।',
 'district',
 ARRAY['Muzaffarpur', 'Vaishali', 'East Champaran', 'Samastipur'],
 20, 500, NULL, 20000.00,
 'https://horticulture.bihar.gov.in',
 ARRAY['आधार कार्ड', 'जमीन के कागजात', 'बैंक पासबुक']
),

('भागलपुर रेशम उद्योग सहायता',
 'भागलपुर के रेशम (Tussar silk) किसानों और बुनकरों के लिए विशेष सहायता योजना।',
 'district',
 ARRAY['Bhagalpur', 'Banka'],
 5, 200, NULL, 15000.00,
 'https://dbtagriculture.bihar.gov.in',
 ARRAY['आधार कार्ड', 'रेशम उत्पादन प्रमाण', 'बैंक पासबुक']
);


-- ══════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so our server-side API works fine.
-- These policies are for direct Supabase client access (if ever used from frontend).

-- Farmers: Can view and update own profile
CREATE POLICY "Farmers can view own profile" ON farmers FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Farmers can update own profile" ON farmers FOR UPDATE USING (auth.uid()::text = id::text);

-- Detections: Can view own detections
CREATE POLICY "Farmers can view own detections" ON detections FOR SELECT USING (farmer_id::text = auth.uid()::text);
CREATE POLICY "Farmers can insert own detections" ON detections FOR INSERT WITH CHECK (farmer_id::text = auth.uid()::text);

-- Chat history: Can view own chats
CREATE POLICY "Farmers can view own chat history" ON chat_history FOR SELECT USING (farmer_id::text = auth.uid()::text);

-- Notifications: Can view own notifications
CREATE POLICY "Farmers can view own notifications" ON notifications FOR SELECT USING (farmer_id::text = auth.uid()::text);

-- Schemes: Everyone can read active schemes
CREATE POLICY "Everyone can view active schemes" ON schemes FOR SELECT USING (is_active = true);

-- Allow service role full access (for server-side operations)
-- Note: Service role key already bypasses RLS in Supabase by default.
