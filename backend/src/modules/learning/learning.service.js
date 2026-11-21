// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Central Knowledge Engine
//  Candidates → scoring → verification → RAG retrieval → feedback
// ═══════════════════════════════════════════════════════════════════
const { supabase, isConfigured } = require('../../config/supabase');
const logger = require('../../config/logger');

const SOURCE_RELIABILITY = {
  icar: 95, kvk: 90, university: 88, govt: 92, expert: 90,
  community: 30, ai_extracted: 20, farmer_report: 25
};

const norm = s => String(s || '').toLowerCase().trim();

// ── Trust scoring (heuristic, NOT scientific proof) ──
function computeTrustScore(k) {
  let score = SOURCE_RELIABILITY[k.source_type] ?? 30;
  if (k.trust_status === 'expert_verified') score = Math.min(100, score + 15);
  if (k.trust_status === 'corroborated') score = Math.min(100, score + 8);
  if (k.trust_status === 'rejected' || k.trust_status === 'expired') score = 0;
  // recency bonus
  if (k.updated_at) {
    const ageDays = (Date.now() - new Date(k.updated_at)) / 86400000;
    if (ageDays < 90) score += 5; else if (ageDays > 365) score -= 10;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Ingest a knowledge candidate (from community/chat/detection) ──
async function ingestCandidate({ module, ref_id, raw_text, extracted = {} }) {
  if (!isConfigured) { logger.warn('learning: supabase not configured'); return null; }
  const { data, error } = await supabase.from('knowledge_candidates').insert({
    module, ref_id, raw_text: String(raw_text || '').slice(0, 5000), extracted
  }).select().single();
  if (error) { logger.error({ err: error.message }, 'candidate ingest failed'); return null; }
  return data;
}

// ── Extract structured hints from free text (lightweight, no LLM needed) ──
function extractHints(text) {
  const t = norm(text);
  const crops = ['wheat','paddy','rice','maize','cotton','mustard','chana','moong','urad','soybean','sugarcane','potato','onion','tomato','brinjal','okra','banana','mango','dhaincha'];
  const foundCrop = crops.find(c => t.includes(c)) || null;
  const problemWords = ['disease','pest','insect','fungus','blight','wilting','yellow','spot','rot','aphid','borer','mite','virus'];
  const hasProblem = problemWords.some(w => t.includes(w));
  return { crop: foundCrop, hasProblem, keywords: crops.filter(c => t.includes(c)) };
}

// ── RAG retrieval: keyword + crop + region match over VERIFIED knowledge ──
async function retrieveKnowledge({ query, crop, state, district, limit = 5 }) {
  if (!isConfigured) return [];
  const hints = extractHints(query || '');
  const q = norm(query);
  const words = q.split(/\s+/).filter(w => w.length > 3).slice(0, 6);

  let qb = supabase.from('agricultural_knowledge')
    .select('id,category,title,content,crop,state,district,source_type,source_ref,trust_status,trust_score,updated_at')
    .in('trust_status', ['expert_verified', 'corroborated', 'unverified'])
    .order('trust_score', { ascending: false })
    .limit(50);

  const { data, error } = await qb;
  if (error || !data) return [];

  // Score each: keyword overlap + crop/region match + trust
  const scored = data.map(k => {
    let s = k.trust_score || computeTrustScore(k);
    const text = norm(k.title + ' ' + k.content);
    words.forEach(w => { if (text.includes(w)) s += 8; });
    if (crop && norm(k.crop) === norm(crop)) s += 15;
    if (state && norm(k.state) === norm(state)) s += 10;
    if (district && norm(k.district) === norm(district)) s += 12;
    if (hints.crop && norm(k.crop) === hints.crop) s += 10;
    return { ...k, score: s };
  }).sort((a, b) => b.score - a.score).slice(0, limit);

  return scored;
}

// ── Submit feedback ──
async function submitFeedback({ module, ref_id, farmer_id, rating, comment }) {
  if (!isConfigured) return null;
  const { data, error } = await supabase.from('knowledge_feedback').insert({
    module, ref_id: String(ref_id), farmer_id: farmer_id || null, rating, comment: comment || null
  }).select().single();
  return error ? null : data;
}

// ── Log AI conversation ──
async function logConversation({ farmer_id, question, answer, context, sources }) {
  if (!isConfigured) return null;
  const { data, error } = await supabase.from('ai_conversations').insert({
    farmer_id: farmer_id || null, question: String(question).slice(0, 4000),
    answer: answer ? String(answer).slice(0, 8000) : null,
    context: context || {}, sources: sources || []
  }).select('id').single();
  return error ? null : data;
}

// ── Disease label queue ──
async function queueDiseaseLabel({ detection_id, image_ref, predicted_crop, predicted_disease, confidence, farmer_id }) {
  if (!isConfigured) return null;
  const { data, error } = await supabase.from('disease_label_queue').insert({
    detection_id, image_ref, predicted_crop, predicted_disease, confidence,
    farmer_feedback: null, status: 'pending'
  }).select('id').single();
  return error ? null : data;
}

async function submitDiseaseFeedback({ detection_id, rating, farmer_id }) {
  if (!isConfigured) return null;
  // update queue entry + insert feedback
  await supabase.from('disease_label_queue').update({ farmer_feedback: rating }).eq('detection_id', detection_id);
  return submitFeedback({ module: 'disease', ref_id: detection_id, farmer_id, rating });
}

// ── Admin/expert: knowledge review ──
async function reviewKnowledge(knowledgeId, { decision, reviewer_id, notes }) {
  if (!isConfigured) return null;
  const statusMap = { approve: 'expert_verified', reject: 'rejected', corroborate: 'corroborated' };
  const newStatus = statusMap[decision];
  if (!newStatus) return null;
  const { data, error } = await supabase.from('agricultural_knowledge')
    .update({ trust_status: newStatus, verified_by: reviewer_id, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', knowledgeId).select().single();
  if (!error) {
    await supabase.from('expert_reviews').insert({ target_type: 'knowledge', target_id: knowledgeId, reviewer_id, decision, notes });
    await supabase.from('knowledge_audit_logs').insert({ actor_id: reviewer_id, action: decision, entity_type: 'knowledge', entity_id: knowledgeId, meta: { notes } });
  }
  return error ? null : data;
}

// ── Candidate review ──
async function reviewCandidate(candidateId, { decision, reviewer_id }) {
  if (!isConfigured) return null;
  const status = decision === 'approve' ? 'accepted' : 'rejected';
  const { data: cand } = await supabase.from('knowledge_candidates').update({ status, reviewed_by: reviewer_id, reviewed_at: new Date().toISOString() }).eq('id', candidateId).select().single();
  if (cand && status === 'accepted') {
    // promote to knowledge with unverified status (needs expert verify for trusted)
    const ex = cand.extracted || {};
    await supabase.from('agricultural_knowledge').insert({
      category: ex.category || 'crop_mgmt', title: (cand.raw_text || '').slice(0, 120),
      content: cand.raw_text, crop: ex.crop || null, state: ex.state || null, district: ex.district || null,
      source_type: 'community', source_ref: cand.ref_id, trust_status: 'unverified', trust_score: 30
    });
  }
  await supabase.from('expert_reviews').insert({ target_type: 'candidate', target_id: candidateId, reviewer_id, decision });
  return cand;
}

// ── Farmer context (opt-in) ──
async function getFarmerContext(farmer_id) {
  if (!isConfigured) return null;
  const { data } = await supabase.from('farmer_context').select('*').eq('farmer_id', farmer_id).maybeSingle();
  return data;
}
async function saveFarmerContext(farmer_id, ctx) {
  if (!isConfigured) return null;
  const { data, error } = await supabase.from('farmer_context').upsert({
    farmer_id, preferred_lang: ctx.preferred_lang, crops: ctx.crops || [],
    location: ctx.location || null, problems: ctx.problems || [], outcomes: ctx.outcomes || [],
    consent: ctx.consent !== false, updated_at: new Date().toISOString()
  }).select().single();
  return error ? null : data;
}

// ── Analytics: knowledge gaps ──
async function getInsights() {
  if (!isConfigured) return {};
  const [{ data: pend }, { data: fb }, { data: conv }] = await Promise.all([
    supabase.from('knowledge_candidates').select('module').eq('status', 'pending'),
    supabase.from('knowledge_feedback').select('rating, module'),
    supabase.from('ai_conversations').select('context').order('created_at', { ascending: false }).limit(200)
  ]);
  const gapCrops = {};
  (conv || []).forEach(c => { const crop = c.context?.crop; if (crop) gapCrops[crop] = (gapCrops[crop] || 0) + 1; });
  const negFb = (fb || []).filter(f => ['not_helpful', 'incorrect', 'wrong_diag'].includes(f.rating)).length;
  return {
    pendingCandidates: (pend || []).length,
    totalFeedback: (fb || []).length,
    negativeFeedback: negFb,
    topCropsByVolume: Object.entries(gapCrops).sort((a, b) => b[1] - a[1]).slice(0, 10)
  };
}

module.exports = {
  ingestCandidate, extractHints, retrieveKnowledge, submitFeedback,
  logConversation, queueDiseaseLabel, submitDiseaseFeedback,
  reviewKnowledge, reviewCandidate, getFarmerContext, saveFarmerContext, getInsights,
  computeTrustScore
};
