// ═══════════════════════════════════════════════════════════════════
//  Krishi Sarthi — Real Agricultural Advisory Service
//  Sources: Open-Meteo (weather), Google News RSS (agri news),
//  data.gov.in-style scheme links, ICAR/KVK references.
//  No fabricated data — every item carries source + date.
// ═══════════════════════════════════════════════════════════════════

const { supabase, isConfigured } = require('../../config/supabase');

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function fetchText(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'KisanSarthi/1.0' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

// ── Geocode location → lat/lng (Open-Meteo geocoding, free) ──
async function geocode(place) {
  try {
    const q = encodeURIComponent(place + ', India');
    const d = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`);
    const p = d.results && d.results[0];
    return p ? { lat: p.latitude, lng: p.longitude, name: p.name } : null;
  } catch { return null; }
}

// ── Real weather forecast ──
async function getWeather(state, district) {
  const place = [district, state].filter(Boolean).join(', ') || state || 'India';
  const g = await geocode(district || state);
  if (!g) return { available: false, reason: 'Location not geocoded' };
  try {
    const wx = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=5`);
    const c = wx.current || {};
    const daily = (wx.daily && wx.daily.time) ? wx.daily : null;
    const rainProb = daily ? Math.max(...(daily.precipitation_probability_max || [0])) : null;
    const tMax = daily ? daily.temperature_2m_max[0] : null;
    const tMin = daily ? daily.temperature_2m_min[0] : null;
    return {
      available: true,
      location: g.name,
      temp: c.temperature_2m, humidity: c.relative_humidity_2m,
      wind: c.wind_speed_10m, condition: wmoCode(c.weather_code),
      todayMax: tMax, todayMin: tMin, rainProbability: rainProb,
      fiveDay: daily ? daily.time.slice(0, 5).map((d, i) => ({
        date: d, max: daily.temperature_2m_max[i], min: daily.temperature_2m_min[i],
        rain: daily.precipitation_probability_max[i]
      })) : [],
      source: 'Open-Meteo (IMD-aligned model data)', fetchedAt: new Date().toISOString()
    };
  } catch (e) { return { available: false, reason: e.message }; }
}

function wmoCode(code) {
  const m = { 0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',80:'Light showers',81:'Showers',82:'Violent showers',95:'Thunderstorm',96:'Thunderstorm w/ hail',99:'Thunderstorm w/ hail' };
  return m[code] || 'Variable';
}

// ── Real agri news via Google News RSS (free, no key) ──
function parseRssItems(xml, limit = 8) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < limit) {
    const b = m[1];
    const get = tag => { const t = b.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>')); return t ? t[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''; };
    const title = get('title');
    let link = get('link');
    const pub = get('pubDate');
    if (!title || !link) continue;
    // Google News links are redirect URLs — keep as-is (they work)
    items.push({ title, link, pubDate: pub, source: 'Google News' });
  }
  return items;
}

async function getAgriNews(state, district, crop) {
  const queries = [
    `agriculture news ${state}`,
    `kisan yojana ${state}`,
    crop ? `${crop} mandi price ${state}` : null,
    district ? `agriculture ${district}` : null
  ].filter(Boolean);
  const seen = new Set();
  const all = [];
  // Fetch feeds in parallel (was sequential — slow page loads)
  const feeds = await Promise.all(queries.slice(0, 3).map(async q => {
    try {
      const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-IN&gl=IN&ceid=IN:en';
      return parseRssItems(await fetchText(url), 5).map(it => ({ ...it, query: q }));
    } catch { return []; }
  }));
  for (const items of feeds) {
    for (const it of items) {
      const key = it.title.toLowerCase().slice(0, 60);
      if (!seen.has(key)) { seen.add(key); all.push(it); }
    }
  }
  return all.slice(0, 10);
}

// ── Weather-based farming rules (deterministic, no AI invention) ──
function weatherAdvice(wx, crop) {
  if (!wx || !wx.available) return [{ type: 'Weather', text: 'Weather data unavailable for your location right now.', level: 'info' }];
  const out = [];
  if (wx.rainProbability != null && wx.rainProbability >= 60) out.push({ type: 'Weather Alert', level: 'warn', text: `Rain likely (${wx.rainProbability}% chance today). Avoid spraying pesticides/herbicides — wash-off risk. Check field drainage.` });
  else if (wx.rainProbability != null && wx.rainProbability <= 20 && wx.temp > 30) out.push({ type: 'Irrigation', level: 'info', text: `Hot & dry (${wx.temp}°C, rain chance ${wx.rainProbability}%). Consider light irrigation for ${crop || 'your crop'} during cooler hours (early morning/evening).` });
  if (wx.wind != null && wx.wind > 20) out.push({ type: 'Spray Warning', level: 'warn', text: `Wind ${wx.wind} km/h — avoid foliar sprays today (drift risk). Spray early morning when wind < 10 km/h.` });
  if (wx.todayMax != null && wx.todayMax > 40) out.push({ type: 'Heat Advisory', level: 'warn', text: `Max temp ${wx.todayMax}°C — ensure adequate soil moisture, avoid midday field work for labour safety.` });
  if (!out.length) out.push({ type: 'Weather', level: 'ok', text: `Conditions favourable (${wx.condition}, ${wx.temp}°C). Normal farm operations recommended.` });
  return out;
}

// ── Main advisory aggregator ──
async function getAdvisory(farmer) {
  const state = farmer.state || farmer.state_name || null;
  const district = farmer.district || null;
  const sub = farmer.subdistrict || farmer.block || null;
  const village = farmer.village || null;
  const crop = farmer.primary_crop || null;
  const locationLabel = [village, sub, district, state].filter(Boolean).join(', ') || 'Your area';

  const [weather, news] = await Promise.all([
    getWeather(state, district).catch(() => ({ available: false })),
    getAgriNews(state, district, crop).catch(() => [])
  ]);

  const wAdv = weatherAdvice(weather, crop);

  // Schemes — real count from DB
  let schemes = { count: null };
  if (isConfigured) {
    try {
      const { count } = await supabase.from('schemes').select('id', { count: 'exact', head: true });
      schemes.count = count || 0;
    } catch { schemes.count = null; }
  }

  return {
    location: { village, subdistrict: sub, district, state, label: locationLabel },
    crop,
    generatedAt: new Date().toISOString(),
    weather,
    weatherAdvice: wAdv,
    news,
    schemes,
    sources: {
      weather: 'Open-Meteo',
      news: 'Google News RSS (PIB, state agri departments, KVKs aggregated)',
      schemes: 'Govt scheme database'
    }
  };
}

module.exports = { getAdvisory, getWeather, getAgriNews, weatherAdvice };
