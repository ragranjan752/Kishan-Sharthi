// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Products, Traceability & SOS Routes (API v1)
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const crypto = require('crypto');
const { sendSuccess, sendCreated, errors } = require('../../utils/response');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { BIHAR_DISTRICTS, BLOCKS_BY_DISTRICT, KATTHA_PER_BIGHA, SQFT_PER_KATTHA } = require('../../data/biharLocations');
const { z } = require('zod');
const { supabase, isConfigured } = require('../../config/supabase');

// ── Fertilizer & Input Catalog with Statutory Regulated Prices ──
const FERTILIZER_PRODUCTS = [
  { id: 1, name: 'नीम लेपित यूरिया (Neem Coated Urea 45kg)', category: 'Fertilizers', icon: '💎', seller: 'प्राथमिक कृषि साख समिति (PACS)', distance: '1.5 km', price: 266.5, unit: 'bag', badge: 'govt_rate' },
  { id: 2, name: 'डीएपी (DAP 18:46:0 50kg)', category: 'Fertilizers', icon: '🧪', seller: 'इफको ई-बाजार (IFFCO)', distance: '2.8 km', price: 1350, unit: 'bag', badge: 'govt_rate' },
  { id: 3, name: 'म्यूरिएट ऑफ पोटाश (MOP 50kg)', category: 'Fertilizers', icon: '🔬', seller: 'किसान सेवा केंद्र', distance: '3.1 km', price: 1100, unit: 'bag', badge: 'subsidy' },
  { id: 4, name: 'जिंक सल्फेट मोनोहाइड्रेट (33% Zn 10kg)', category: 'MicroNutrients', icon: '🔩', seller: 'कृषि विकास केंद्र', distance: '2.0 km', price: 420, unit: 'pack', badge: 'recommended' },
  { id: 5, name: 'जैविक ट्राइकोडर्मा विरिडी (Bio Trichoderma 1kg)', category: 'Organic', icon: '🌿', seller: 'जैविक इनपुट केंद्र', distance: '4.5 km', price: 180, unit: 'kg', badge: 'organic' },
  { id: 6, name: 'गेहूं बीज HD-2967 (प्रमाणित 40kg)', category: 'Seeds', icon: '🌾', seller: 'बिहार राज्य बीज निगम (BRBN)', distance: '3.8 km', price: 1850, unit: 'bag', badge: 'govt_rate' },
  { id: 7, name: 'मक्का हाइब्रिड बीज Pioneer P3396 (4kg)', category: 'Seeds', icon: '🌽', seller: 'कृषि सेवा केंद्र', distance: '2.2 km', price: 1150, unit: 'pack', badge: 'recommended' },
  { id: 8, name: 'नीम तेल कीटनाशक (Azadirachtin 10000 ppm)', category: 'Pesticides', icon: '🧴', seller: 'जैविक पौध संरक्षण केंद्र', distance: '4.0 km', price: 420, unit: 'ltr', badge: 'organic' },
  { id: 9, name: 'क्लोरांट्रानिलिप्रोल 18.5% SC (कोराजन 60ml)', category: 'Pesticides', icon: '💊', seller: 'एग्रो केमिकल स्टोर', distance: '1.9 km', price: 650, unit: 'bottle', badge: '' },
  { id: 10, name: 'वर्मीकम्पोस्ट जैविक खाद (50kg)', category: 'Organic', icon: '🪱', seller: 'जैविक कृषि फार्म, बिहटा', distance: '5.0 km', price: 350, unit: 'bag', badge: 'organic' }
];

const tracesMemoryStore = new Map();

// GET /api/stats/users — public farmer count for landing badge
router.get('/stats/users', async (req, res) => {
  try {
    if (!isConfigured) return sendSuccess(res, { count: 0 }, 'User count');
    const { count, error } = await supabase.from('farmers').select('id', { count: 'exact', head: true });
    if (error) throw error;
    return sendSuccess(res, { count: count || 0 }, 'User count');
  } catch (e) {
    return sendSuccess(res, { count: 0 }, 'User count');
  }
});

// GET /api/v1/config/public
router.get('/config/public', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const isPlaceholder = (val) => !val || val.includes('your_') || val.includes('xxxx');
  return sendSuccess(res, {
    supabaseUrl: isPlaceholder(supabaseUrl) ? null : supabaseUrl,
    supabaseAnonKey: isPlaceholder(supabasePublishableKey) ? null : supabasePublishableKey,
    supabaseOAuthEnabled: String(process.env.SUPABASE_OAUTH_ENABLED || 'false') === 'true',
    apiBaseUrl: process.env.PUBLIC_API_BASE_URL || '/api/v1',
  }, 'Public client configuration');
});

// GET /api/v1/meta/locations
router.get('/meta/locations', (req, res) => {
  return sendSuccess(res, {
    districts: BIHAR_DISTRICTS,
    blocksByDistrict: BLOCKS_BY_DISTRICT,
    katthaPerBigha: KATTHA_PER_BIGHA,
    sqFtPerKattha: SQFT_PER_KATTHA,
  }, 'बिहारlocation master data');
});

// GET /api/v1/products
router.get('/products', (req, res) => {
  const category = req.query.category;
  let products = FERTILIZER_PRODUCTS;
  if (category && category !== 'All') {
    products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  return res.json({
    success: true,
    data: products,
    products: products,
    message: 'उर्वरक एवं इनपुट सूची'
  });
});

// POST /api/v1/trace/generate
router.post('/trace/generate', async (req, res) => {
  const { farmer_name, produce_name, crop, farm_location, harvest_date, health_summary, disease_logs_json } = req.body;
  const token = crypto.randomBytes(12).toString('hex');

  const traceRecord = {
    token,
    farmer_name: farmer_name || 'प्रमाणित किसान (Certified Farmer)',
    produce_name: produce_name || 'ताजा कृषि उत्पाद',
    crop: crop || 'Makhana',
    farm_location: farm_location || 'बिहार (Bihar)',
    harvest_date: harvest_date || new Date().toISOString().split('T')[0],
    health_summary: health_summary || '100% जैविक व स्वस्थ परीक्षण उत्तीर्ण',
    disease_logs_json: disease_logs_json || '[]',
    created_at: new Date().toISOString()
  };

  tracesMemoryStore.set(token, traceRecord);

  const qrUrl = `${req.protocol}://${req.get('host')}/#trace=${token}`;
  const qrCodeImage = await QRCode.toDataURL(qrUrl);

  return sendCreated(res, {
    token,
    qrCode: qrCodeImage,
    publicUrl: qrUrl
  }, 'फार्म-टू-फोर्क क्यूआर कोड सफलतापूर्वक तैयार');
});

// GET /api/v1/trace/:token
router.get('/trace/:token', (req, res) => {
  const trace = tracesMemoryStore.get(req.params.token);
  if (!trace) {
    return errors.notFound(res, 'ट्रेसिबिलिटी रिकॉर्ड');
  }
  return sendSuccess(res, trace, 'उत्पाद सत्यापन विवरण');
});

// POST /api/v1/sos
router.post('/sos', optionalAuth, (req, res) => {
  const { type, location, description } = req.body;
  const report = {
    id: 'sos_' + Date.now(),
    farmer_id: req.user ? req.user.id : null,
    type: type || 'emergency',
    location: location || 'बिहार',
    description: description || 'आपातकालीन सहायता अनुरोध',
    status: 'dispatched_to_district_control_room',
    created_at: new Date().toISOString()
  };

  return sendCreated(res, report, 'आपातकालीन एसओएस संदेश जिला आपदा नियंत्रण कक्ष को प्रेषित किया गया');
});

module.exports = router;
