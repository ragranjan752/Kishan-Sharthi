// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Mandi Prices & Dashboard Metrics (API v1)
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { sendSuccess } = require('../../utils/response');
const { optionalAuth } = require('../../middleware/auth');

const BIHAR_MANDI_DATA = [
  { crop: '🌾 Dhan (Paddy)', category: 'grains', mandi: 'Bhojpur (Ara), Bihar', price: 2183, msp: 2183, change_val: 0, pct: '0.0%', trend: '→' },
  { crop: '🌾 Dhan (Paddy)', category: 'grains', mandi: 'Buxar, Bihar', price: 2195, msp: 2183, change_val: 12, pct: '+0.55%', trend: '↑' },
  { crop: '🌸 Makhana (Raw)', category: 'commercial', mandi: 'Darbhanga, Bihar', price: 14500, msp: null, change_val: 350, pct: '+2.47%', trend: '↑' },
  { crop: '🌸 Makhana (Raw)', category: 'commercial', mandi: 'Madhubani, Bihar', price: 14200, msp: null, change_val: 200, pct: '+1.43%', trend: '↑' },
  { crop: '🌽 Makka (Rabi Maize)', category: 'grains', mandi: 'Khagaria, Bihar', price: 2280, msp: 2090, change_val: 45, pct: '+2.01%', trend: '↑' },
  { crop: '🌽 Makka (Rabi Maize)', category: 'grains', mandi: 'Gulabbagh (Purnia), Bihar', price: 2310, msp: 2090, change_val: 60, pct: '+2.67%', trend: '↑' },
  { crop: '🌾 Gehun (Wheat)', category: 'grains', mandi: 'Patna, Bihar', price: 2320, msp: 2275, change_val: 45, pct: '+1.98%', trend: '↑' },
  { crop: '🌾 Gehun (Wheat)', category: 'grains', mandi: 'Muzaffarpur, Bihar', price: 2290, msp: 2275, change_val: 15, pct: '+0.66%', trend: '↑' },
  { crop: '🌿 Sarson (Mustard)', category: 'oilseeds', mandi: 'Samastipur, Bihar', price: 5450, msp: 5650, change_val: -30, pct: '-0.55%', trend: '↓' },
  { crop: '🥔 Potato', category: 'vegetables', mandi: 'Bihar Sharif (Nalanda), Bihar', price: 1120, msp: null, change_val: -15, pct: '-1.32%', trend: '↓' },
  { crop: '🧅 Onion', category: 'vegetables', mandi: 'Fatuha (Patna), Bihar', price: 1850, msp: null, change_val: 40, pct: '+2.21%', trend: '↑' }
];

// GET /api/v1/mandi
router.get('/mandi', (req, res) => {
  return sendSuccess(res, BIHAR_MANDI_DATA, 'मंडी भाव सफलतापूर्वक प्राप्त');
});

// GET /api/v1/dashboard
router.get('/dashboard', optionalAuth, (req, res) => {
  const crop = req.user ? req.user.primary_crop : 'Dhan';
  const matchedPrice = BIHAR_MANDI_DATA.find(m => m.crop.toLowerCase().includes(crop.toLowerCase())) || BIHAR_MANDI_DATA[0];

  return sendSuccess(res, {
    stats: {
      cropHealth: 89,
      cropHealthChange: '↑ 4% पिछले सप्ताह से',
      irrigation: 'Skip',
      irrigationReason: 'गंगा मैदान में वर्षा का पूर्वानुमान',
      msp: `₹${matchedPrice.price.toLocaleString('en-IN')}`,
      mspTrend: matchedPrice.trend,
      eligibleSchemes: 4,
      schemesAmount: '₹35,000 उपलब्ध'
    },
    weather: {
      temp: 31,
      condition: 'धूप व हल्की बदली (Partly Cloudy)',
      humidity: 64,
      forecast: 'आगामी 24 घंटे में हल्की बारिश की संभावना'
    }
  }, 'डैशबोर्ड डेटा');
});

module.exports = router;
