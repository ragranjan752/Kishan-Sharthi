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
  { crop: '🫘 Chana (Gram)', category: 'pulses', mandi: 'Mokama (Patna), Bihar', price: 5850, msp: 5440, change_val: 50, pct: '+0.86%', trend: '↑' },
  { crop: '🫘 Masoor (Lentil)', category: 'pulses', mandi: 'Barh (Patna), Bihar', price: 6200, msp: 6000, change_val: 75, pct: '+1.22%', trend: '↑' },
  { crop: '🌿 Sarson (Mustard)', category: 'oilseeds', mandi: 'Samastipur, Bihar', price: 5450, msp: 5650, change_val: -30, pct: '-0.55%', trend: '↓' },
  { crop: '🥔 Potato', category: 'vegetables', mandi: 'Bihar Sharif (Nalanda), Bihar', price: 1120, msp: null, change_val: -15, pct: '-1.32%', trend: '↓' },
  { crop: '🧅 Onion', category: 'vegetables', mandi: 'Fatuha (Patna), Bihar', price: 1850, msp: null, change_val: 40, pct: '+2.21%', trend: '↑' }
];

// GET /api/v1/mandi
router.get('/mandi', (req, res) => {
  const category = req.query.category;
  let data = BIHAR_MANDI_DATA;
  if (category && category !== 'all') {
    data = data.filter(m => m.category.toLowerCase() === category.toLowerCase());
  }
  return res.json({
    success: true,
    data: data,
    prices: data,
    message: 'मंडी भाव सफलतापूर्वक प्राप्त'
  });
});

// ── Helpers for live dashboard data ──
async function fetchJson(url, ms = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return r.ok ? r.json() : null;
  } catch (_) { return null; } finally { clearTimeout(t); }
}

// Real weather via Open-Meteo (free, no key): geocode district → current conditions
async function getWeatherForDistrict(district) {
  if (!district) return null;
  const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(district)}&count=1&language=en&format=json`);
  const place = geo?.results?.[0];
  if (!place) return null;
  const wx = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code&daily=precipitation_probability_max&timezone=auto`);
  if (!wx?.current) return null;
  const codes = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm' };
  const rainProb = wx.daily?.precipitation_probability_max?.[0];
  return {
    temp: Math.round(wx.current.temperature_2m),
    condition: codes[wx.current.weather_code] || 'Unknown',
    humidity: wx.current.relative_humidity_2m,
    location: place.name,
    rainProbability: rainProb ?? null
  };
}

// GET /api/v1/dashboard — returns only real, user-specific data (null when unknown)
router.get('/dashboard', optionalAuth, async (req, res) => {
  const farmer = req.user || null;
  const crop = farmer?.primary_crop || null;
  const matchedPrice = crop
    ? (BIHAR_MANDI_DATA.find(m => m.crop.toLowerCase().includes(String(crop).toLowerCase())) || null)
    : null;

  // ── Crop health from actual disease detections ──
  let cropHealth = null, cropHealthChange = null;
  if (farmer?.id) {
    try {
      const detectionService = require('../detections/detections.service');
      const history = await detectionService.getFarmerDetections(farmer.id);
      if (history.length) {
        const diseased = history.filter(d => d.health_status === 'diseased' || (d.disease_name && !/no clear/i.test(d.disease_name))).length;
        cropHealth = Math.max(0, Math.round((1 - diseased / history.length) * 100));
        cropHealthChange = `${history.length} scan(s) recorded`;
      }
    } catch (_) { /* detections unavailable */ }
  }

  // ── Weather + schemes in parallel (speed) ──
  const [weather, schemesResult] = await Promise.all([
    getWeatherForDistrict(farmer?.district).catch(() => null),
    farmer ? Promise.resolve().then(() => require('../schemes/schemes.service').getEligibleSchemesForFarmer(farmer)).catch(() => null) : Promise.resolve(null)
  ]);
  let irrigation = null, irrigationReason = null;
  if (weather?.rainProbability != null) {
    irrigation = weather.rainProbability >= 40 ? 'Skip' : 'Needed';
    irrigationReason = weather.rainProbability >= 40
      ? `${weather.rainProbability}% chance of rain in ${weather.location}`
      : `Low rain chance (${weather.rainProbability}%) in ${weather.location}`;
  }

  // ── Eligible schemes — real evaluation against farmer profile ──
  let eligibleSchemes = null, schemesAmount = null;
  if (schemesResult) {
    const eligible = schemesResult.filter(s => s.is_eligible);
    eligibleSchemes = eligible.length;
    const total = eligible.reduce((sum, s) => sum + (Number(s.benefit_amount) || 0), 0);
    schemesAmount = total > 0 ? `₹${total.toLocaleString('en-IN')} available` : 'No cash benefit listed';
  }

  return sendSuccess(res, {
    stats: {
      cropHealth,
      cropHealthChange,
      irrigation,
      irrigationReason,
      marketPrice: matchedPrice ? `₹${matchedPrice.price.toLocaleString('en-IN')}` : null,
      marketTrend: matchedPrice ? matchedPrice.trend : null,
      mandi: matchedPrice ? matchedPrice.mandi : null,
      eligibleSchemes,
      schemesAmount
    },
    weather: weather ? {
      temp: weather.temp,
      condition: weather.condition,
      humidity: weather.humidity,
      location: weather.location,
      forecast: weather.rainProbability != null ? `${weather.rainProbability}% rain chance today` : null
    } : null
  }, 'डैशबोर्ड डेटा');
});

module.exports = router;
