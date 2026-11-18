// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Crop Disease Vision Analysis
//  Sends actual image bytes to configured vision providers and enforces
//  a strict structured JSON contract. No fabricated diagnoses.
// ═══════════════════════════════════════════════════════════════════

const logger = require('../../config/logger');

const SCHEMA_HINT = `Return ONLY valid JSON with this shape:
{
  "image_suitable": true,
  "crop_name": "Rice|Wheat|Maize|Mustard|Makhana|Litchi|Mango|Vegetable|Unknown",
  "plant_part": "Leaf|Stem|Fruit|Root|Whole plant|Unknown",
  "health_status": "healthy|diseased|nutrient_deficiency|environmental_stress|unclear",
  "primary_diagnosis": {
    "disease_name": "possible disease or stress name or null",
    "confidence_score": 0,
    "symptoms_observed": [],
    "supporting_evidence": []
  },
  "alternative_diagnoses": [],
  "severity": "low|medium|high|critical|unknown",
  "recommendations": [],
  "prevention": [],
  "needs_expert_verification": true,
  "disclaimer": "AI-generated preliminary assessment."
}`;

function buildPrompt(cropHint) {
  return `You are an agricultural computer-vision assistant for Bihar farmers.
First decide whether the image clearly shows a plant/crop and whether it is suitable for diagnosis.
If the image is blurry, unrelated, or lacks visible plant symptoms, set image_suitable=false and health_status="unclear".
Identify the probable crop among Makhana, Paddy/Rice, Maize, Wheat, Mustard, Litchi, Mango, and seasonal vegetables.
Do not invent diseases, pesticide names, dosages, or schedules. Prefer cautious wording and mark needs_expert_verification=true.
Crop hint from farmer (may be wrong): ${cropHint || 'not provided'}.
${SCHEMA_HINT}`;
}

function extractJson(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function clampConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function validateAnalysis(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI returned malformed JSON');
  }
  const primary = raw.primary_diagnosis && typeof raw.primary_diagnosis === 'object' ? raw.primary_diagnosis : {};
  const confidence = clampConfidence(primary.confidence_score);
  const health = ['healthy', 'diseased', 'nutrient_deficiency', 'environmental_stress', 'unclear'].includes(raw.health_status)
    ? raw.health_status
    : 'unclear';
  const severity = ['low', 'medium', 'high', 'critical', 'unknown'].includes(raw.severity) ? raw.severity : 'unknown';
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, 8) : []);

  const imageSuitable = raw.image_suitable !== false;
  const usable = imageSuitable && health !== 'unclear';

  return {
    image_suitable: imageSuitable,
    crop_name: typeof raw.crop_name === 'string' && raw.crop_name.trim() ? raw.crop_name.trim() : 'Unknown',
    plant_part: typeof raw.plant_part === 'string' && raw.plant_part.trim() ? raw.plant_part.trim() : 'Unknown',
    health_status: health,
    primary_diagnosis: {
      disease_name: usable && typeof primary.disease_name === 'string' && primary.disease_name.trim()
        ? primary.disease_name.trim()
        : null,
      confidence_score: confidence,
      confidence_source: confidence == null ? 'not_provided' : 'model_reported',
      symptoms_observed: arr(primary.symptoms_observed),
      supporting_evidence: arr(primary.supporting_evidence),
    },
    alternative_diagnoses: arr(raw.alternative_diagnoses).slice(0, 5),
    severity: usable ? severity : 'unknown',
    recommendations: arr(raw.recommendations),
    prevention: arr(raw.prevention),
    needs_expert_verification: raw.needs_expert_verification !== false,
    disclaimer: typeof raw.disclaimer === 'string' && raw.disclaimer.trim()
      ? raw.disclaimer.trim()
      : 'AI-generated preliminary assessment. Verify with a local agriculture expert before treatment.',
  };
}

function confidenceTier(analysis) {
  const score = analysis?.primary_diagnosis?.confidence_score;
  if (!analysis?.image_suitable || analysis?.health_status === 'unclear' || score == null) return 'uncertain_requires_human_inspection';
  if (score >= 75) return 'high_confidence';
  if (score >= 50) return 'medium_confidence';
  return 'low_confidence';
}

async function callGeminiVision({ prompt, imageBuffer, mimeType, apiKey }) {
  const model = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: imageBuffer.toString('base64') } },
        { text: prompt },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1200, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Gemini vision error (${res.status})`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini vision response');
  return { provider: 'gemini', model, raw: extractJson(text), text };
}

async function callOpenAIVision({ prompt, imageBuffer, mimeType, apiKey }) {
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  const payload = {
    model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    }],
    temperature: 0.1,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`OpenAI vision error (${res.status})`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty OpenAI vision response');
  return { provider: 'openai', model, raw: extractJson(text), text };
}

async function analyzeCropImage({ imageBuffer, mimeType, cropHint }) {
  if (!imageBuffer || imageBuffer.length < 2048) {
    throw new Error('Image is too small or corrupted to analyze');
  }
  const prompt = buildPrompt(cropHint);
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey && !geminiKey.includes('your_')) {
    try {
      const out = await callGeminiVision({ prompt, imageBuffer, mimeType, apiKey: geminiKey });
      return { ...out, analysis: validateAnalysis(out.raw) };
    } catch (err) {
      logger.warn({ err: err.message }, 'Gemini vision failed, trying OpenAI fallback');
    }
  }

  if (openaiKey && !openaiKey.includes('your_')) {
    try {
      const out = await callOpenAIVision({ prompt, imageBuffer, mimeType, apiKey: openaiKey });
      return { ...out, analysis: validateAnalysis(out.raw) };
    } catch (err) {
      logger.warn({ err: err.message }, 'OpenAI vision failed');
      throw err;
    }
  }

  return null;
}

module.exports = { analyzeCropImage, validateAnalysis, confidenceTier, extractJson };
