-- ═══════════════════════════════════════════════════════════════════
--  Krishi Sarthi — Continuous Learning & Knowledge System (009)
--  Central knowledge engine: candidates → verification → RAG retrieval
-- ═══════════════════════════════════════════════════════════════════

-- Verified / candidate agricultural knowledge (RAG source of truth)
CREATE TABLE IF NOT EXISTS agricultural_knowledge (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        VARCHAR(50) NOT NULL,          -- disease|pest|irrigation|fertilizer|soil|scheme|market|weather|experience|crop_mgmt
  title           VARCHAR(300) NOT NULL,
  content         TEXT NOT NULL,
  crop            VARCHAR(100),
  state           VARCHAR(100),
  district        VARCHAR(100),
  season          VARCHAR(20),                  -- kharif|rabi|zaid|all
  growth_stage    VARCHAR(100),
  source_type     VARCHAR(30) NOT NULL,         -- icar|kvk|govt|university|community|expert|ai_extracted
  source_ref      TEXT,                          -- URL / doc ref / post id
  trust_status    VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|unverified|corroborated|expert_verified|rejected|expired
  trust_score     NUMERIC(5,2) DEFAULT 0,       -- 0-100, NOT proof of validity
  verified_by     UUID,                          -- expert/farmer id
  verified_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  version         INT DEFAULT 1,
  parent_id       UUID REFERENCES agricultural_knowledge(id),  -- versioning chain
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ak_status ON agricultural_knowledge(trust_status);
CREATE INDEX IF NOT EXISTS idx_ak_crop ON agricultural_knowledge(crop);
CREATE INDEX IF NOT EXISTS idx_ak_region ON agricultural_knowledge(state, district);
CREATE INDEX IF NOT EXISTS idx_ak_category ON agricultural_knowledge(category);

-- Raw knowledge candidates extracted from community/chat/detections
CREATE TABLE IF NOT EXISTS knowledge_candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module          VARCHAR(20) NOT NULL,          -- community|disease|sarthi
  ref_id          VARCHAR(100),                  -- post id / detection id / conversation id
  raw_text        TEXT NOT NULL,
  extracted       JSONB,                          -- {crop,state,district,problem,solution,outcome,...}
  status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|accepted|rejected|merged
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kc_status ON knowledge_candidates(status);
CREATE INDEX IF NOT EXISTS idx_kc_module ON knowledge_candidates(module);

-- Unified feedback across modules
CREATE TABLE IF NOT EXISTS knowledge_feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module          VARCHAR(20) NOT NULL,          -- sarthi|disease|community
  ref_id          VARCHAR(100) NOT NULL,         -- message/conversation/detection/post id
  farmer_id       UUID,
  rating          VARCHAR(20) NOT NULL,          -- helpful|not_helpful|incorrect|outdated|solved|needs_expert|correct_diag|wrong_diag|unsure
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kf_module ON knowledge_feedback(module, ref_id);

-- AI conversations log (raw, private per farmer)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       UUID,
  question        TEXT NOT NULL,
  answer          TEXT,
  context         JSONB,                          -- crop/state/district/season extracted
  sources         JSONB,                          -- knowledge ids used
  feedback        VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ac_farmer ON ai_conversations(farmer_id);

-- Farmer context (opt-in personalization)
CREATE TABLE IF NOT EXISTS farmer_context (
  farmer_id       UUID PRIMARY KEY,
  preferred_lang  VARCHAR(10),
  crops           JSONB DEFAULT '[]',
  location        JSONB,                          -- {state,district,village} voluntarily given
  problems        JSONB DEFAULT '[]',
  outcomes        JSONB DEFAULT '[]',
  consent         BOOLEAN DEFAULT false,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Disease dataset pipeline (validated labels only)
CREATE TABLE IF NOT EXISTS disease_label_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detection_id    UUID,
  image_ref       TEXT,                           -- storage path, NOT binary
  predicted_crop  VARCHAR(100),
  predicted_disease VARCHAR(150),
  confidence      NUMERIC(5,2),
  farmer_feedback VARCHAR(30),                    -- correct|incorrect|unsure
  expert_label    VARCHAR(150),
  expert_crop     VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'pending',  -- pending|approved|rejected
  dataset_version VARCHAR(20),
  consent         BOOLEAN DEFAULT false,
  reviewed_by     UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  reviewed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dlq_status ON disease_label_queue(status);

-- Training runs & model versions
CREATE TABLE IF NOT EXISTS training_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version VARCHAR(20) NOT NULL,
  model_type      VARCHAR(50),                    -- disease_classifier|rag_ranker|...
  status          VARCHAR(20) DEFAULT 'queued',   -- queued|running|evaluating|approved|deployed|failed
  metrics         JSONB,                          -- {precision,recall,f1,...}
  started_at      TIMESTAMPTZ DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  created_by      UUID
);

CREATE TABLE IF NOT EXISTS model_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type      VARCHAR(50) NOT NULL,
  version         VARCHAR(30) NOT NULL,
  training_run_id UUID REFERENCES training_runs(id),
  metrics         JSONB,
  status          VARCHAR(20) DEFAULT 'candidate', -- candidate|evaluated|approved|deployed|retired
  deployed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Expert review queue + audit
CREATE TABLE IF NOT EXISTS expert_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type     VARCHAR(30) NOT NULL,          -- knowledge|candidate|disease_label
  target_id       UUID NOT NULL,
  reviewer_id     UUID NOT NULL,
  decision        VARCHAR(20) NOT NULL,          -- approve|reject|needs_info
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID,
  action          VARCHAR(50) NOT NULL,          -- create|verify|reject|approve|deploy|delete
  entity_type     VARCHAR(30),
  entity_id       UUID,
  meta            JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);
