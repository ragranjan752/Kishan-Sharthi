// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Disease Detection Service
//  Pipeline: Upload → Validation → Storage → Background Processing
//            → AI Analysis → Confidence Evaluation → Result
// ═══════════════════════════════════════════════════════════════════

const { supabase, isConfigured } = require('../../config/supabase');
const { bucket, isConfigured: isFirebaseConfigured } = require('../../../config/firebase');
const logger = require('../../config/logger');
const crypto = require('crypto');
const fs = require('fs');
const { analyzeCropImage, confidenceTier } = require('./detections.vision');

// In-memory detection cache for offline / demo mode
const detectionsMemoryStore = new Map();

/**
 * Creates detection record and triggers background AI analysis.
 */
async function initiateDetection({ file, farmerId, crop = 'Dhan' }) {
  const detectionId = 'det_' + crypto.randomBytes(8).toString('hex');
  const imageUrl = `/uploads/${file.filename}`;

  const initialRecord = {
    id: detectionId,
    farmer_id: farmerId || null,
    image_url: imageUrl,
    storage_path: file.path,
    disease_name: 'विश्लेषण प्रक्रियाधीन (Analyzing...)',
    confidence_score: null,
    severity: 'unknown',
    status: 'processing',
    model_version: 'krishi-vision-v2-gemini',
    expert_verified: false,
    created_at: new Date().toISOString()
  };

  detectionsMemoryStore.set(detectionId, initialRecord);

  if (isConfigured && farmerId) {
    try {
      await supabase.from('disease_detections').insert({
        id: detectionId,
        farmer_id: farmerId,
        image_url: imageUrl,
        status: 'processing'
      });
    } catch (e) {
      logger.warn({ err: e }, 'Could not record initial detection in Supabase');
    }
  }

  // Trigger background job (simulated asynchronous AI analysis)
  setImmediate(async () => {
    try {
      await processDetectionJob(detectionId, crop, file);
    } catch (err) {
      logger.error({ err, detectionId }, 'Background detection job failed');
    }
  });

  return initialRecord;
}

/**
 * Asynchronous background worker for AI computer vision inference.
 */
async function processDetectionJob(detectionId, cropHint, file) {
  logger.info({ detectionId }, 'Starting background disease detection AI job');

  let vision = null;
  let analysis = null;
  try {
    const imageBuffer = file && file.path ? fs.readFileSync(file.path) : null;
    vision = await analyzeCropImage({
      imageBuffer,
      mimeType: file?.mimetype || 'image/jpeg',
      cropHint,
    });
    analysis = vision?.analysis || null;
  } catch (err) {
    logger.warn({ err: err.message, detectionId }, 'Vision analysis failed');
  }

  const suitable = analysis?.image_suitable !== false && analysis?.health_status !== 'unclear';
  const tier = analysis ? confidenceTier(analysis) : 'uncertain_requires_human_inspection';
  const diseaseName = suitable && analysis.primary_diagnosis?.disease_name
    ? analysis.primary_diagnosis.disease_name
    : (analysis ? 'No clear disease confirmed' : 'AI vision not configured');
  const confidence = suitable ? analysis.primary_diagnosis?.confidence_score ?? null : null;
  const recommendations = [...(analysis?.recommendations || []), ...(analysis?.prevention || [])].filter(Boolean).join(' ');
  const symptoms = [...(analysis?.primary_diagnosis?.symptoms_observed || []), ...(analysis?.alternative_diagnoses || [])].filter(Boolean).join('; ');

  const result = {
    disease_name: diseaseName,
    crop_name: analysis?.crop_name || null,
    plant_part: analysis?.plant_part || null,
    health_status: analysis?.health_status || 'unclear',
    confidence_score: confidence,
    severity: suitable ? analysis.severity : 'unknown',
    cure_organic: recommendations || 'Visit the nearest KVK/agriculture officer for field verification before treatment.',
    cure_chemical: 'Do not spray chemicals without expert confirmation.',
    prevention_tips: analysis?.prevention?.join(' ') || symptoms || 'Capture clearer leaf images in natural light.',
    symptoms_observed: symptoms || null,
    alternative_diagnoses: analysis?.alternative_diagnoses || [],
    needs_expert_verification: analysis?.needs_expert_verification !== false,
    disclaimer: analysis?.disclaimer || 'AI-generated preliminary assessment. Verify with a local agriculture expert before treatment.',
    diagnosis_confidence_tier: tier,
    model_version: vision ? `${vision.provider}:${vision.model}` : 'vision-unconfigured',
    provider: vision?.provider || null,
    status: 'completed',
    expert_verified: false,
    image_suitable: analysis?.image_suitable !== false,
  };

  const existing = detectionsMemoryStore.get(detectionId) || {};
  detectionsMemoryStore.set(detectionId, { ...existing, ...result, updated_at: new Date().toISOString() });

  if (isConfigured) {
    try {
      await supabase.from('disease_detections').update({
        disease_name: result.disease_name,
        confidence_score: result.confidence_score,
        severity: result.severity,
        cure_organic: result.cure_organic,
        cure_chemical: result.cure_chemical,
        prevention_tips: result.prevention_tips,
        model_version: result.model_version,
        status: result.status,
        expert_verified: result.expert_verified,
      }).eq('id', detectionId);
    } catch (e) {
      logger.warn({ err: e }, 'Could not update Supabase detection record');
    }
  }

  logger.info({ detectionId, disease: result.disease_name, tier }, 'Background detection completed');
}

async function getDetectionById(detectionId) {
  if (isConfigured) {
    try {
      const { data, error } = await supabase.from('disease_detections').select('*').eq('id', detectionId).single();
      if (!error && data) return data;
    } catch (e) {
      // Fallback
    }
  }
  return detectionsMemoryStore.get(detectionId) || null;
}

async function getFarmerDetections(farmerId) {
  if (isConfigured) {
    try {
      const { data, error } = await supabase.from('disease_detections')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {
      // Fallback
    }
  }

  const list = [];
  for (const item of detectionsMemoryStore.values()) {
    if (item.farmer_id === farmerId) list.push(item);
  }
  return list;
}

async function verifyDetectionByExpert(detectionId, expertUser, { confirmedDisease, notes }) {
  const existing = await getDetectionById(detectionId);
  if (!existing) return null;

  const updateData = {
    disease_name: confirmedDisease || existing.disease_name,
    expert_verified: true,
    verified_by: expertUser.id || 'authorized_agronomist',
    expert_notes: notes || 'कृषि विशेषज्ञ द्वारा सत्यापित',
    updated_at: new Date().toISOString()
  };

  detectionsMemoryStore.set(detectionId, { ...existing, ...updateData });

  if (isConfigured) {
    try {
      await supabase.from('disease_detections').update(updateData).eq('id', detectionId);
    } catch (e) {
      // Log
    }
  }

  return { ...existing, ...updateData };
}

module.exports = {
  initiateDetection,
  getDetectionById,
  getFarmerDetections,
  verifyDetectionByExpert
};
