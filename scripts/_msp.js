const fs = require('fs');

// ── 1) index.html: MSP ticker + table section at top of page-mandi ──
const f = 'frontend/index.html';
let s = fs.readFileSync(f, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const anchor = '<div class="page" id="page-mandi">';
const ai = s.indexOf(anchor);
if (ai === -1) { console.log('mandi miss'); process.exit(1); }

const section = [
'        <!-- MSP SECTION -->',
'        <div class="msp-ticker-wrap" onmouseenter="this.classList.add(\'paused\')" onmouseleave="this.classList.remove(\'paused\')">',
'          <span class="msp-ticker-label">🏛️ MSP 2025-26</span>',
'          <div class="msp-ticker"><div class="msp-ticker-track" id="msp-ticker-track"></div></div>',
'        </div>',
'        <div class="card" style="margin-bottom:16px;">',
'          <div class="card-title"><span class="dot"></span> 📋 Government MSP Rates — Marketing Season 2025-26</div>',
'          <p style="font-size:12px;color:var(--text-muted);margin:4px 0 10px;">Official Minimum Support Prices announced by Govt of India on recommendations of CACP · ₹ per quintal (FAQ grade) · Prev = 2024-25 season</p>',
'          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">',
'            <input type="text" id="msp-search" placeholder="🔍 Search crop…" oninput="renderMspTable()" style="flex:1;min-width:160px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;">',
'            <select id="msp-season-filter" onchange="renderMspTable()" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:#fff;">',
'              <option value="all">All Seasons</option>',
'              <option value="kharif">Kharif Crops</option>',
'              <option value="rabi">Rabi Crops</option>',
'              <option value="commercial">Commercial Crops</option>',
'            </select>',
'          </div>',
'          <div style="overflow-x:auto;">',
'            <table class="price-table">',
'              <thead><tr><th>#</th><th>Crop</th><th>Category</th><th>MSP 2025-26 (₹/qtl)</th><th>Prev Season</th><th>Change</th><th>Season</th></tr></thead>',
'              <tbody id="msp-tbody"></tbody>',
'            </table>',
'          </div>',
'          <p style="font-size:10px;color:var(--text-muted);margin-top:8px;">Source: CACP recommendations, Govt of India (PIB, Aug 2025) · Last verified: MSP 2025-26 marketing season</p>',
'        </div>'
].join(NL);

const insertAt = s.indexOf('<div class="section-title">📊 Mandi Price Intelligence</div>', ai);
s = s.slice(0, insertAt) + section + NL + s.slice(insertAt);
fs.writeFileSync(f, s);
console.log('html done');

// ── 2) styles.css: ticker animation ──
const cf = 'frontend/styles.css';
let c = fs.readFileSync(cf, 'utf8');
const css = [
'',
'/* MSP Ticker */',
'.msp-ticker-wrap{display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,#E8F5E9,#F1F8E9);border:1.5px solid #A5D6A7;border-radius:10px;padding:8px 12px;margin-bottom:14px;overflow:hidden;}',
'.msp-ticker-label{flex-shrink:0;font-size:12px;font-weight:800;color:#1B5E20;white-space:nowrap;}',
'.msp-ticker{flex:1;overflow:hidden;position:relative;}',
'.msp-ticker-track{display:inline-flex;gap:28px;white-space:nowrap;animation:mspScroll 40s linear infinite;padding-right:28px;}',
'.msp-ticker-wrap.paused .msp-ticker-track{animation-play-state:paused;}',
'.msp-ticker-item{font-size:13px;font-weight:600;color:#2E7D32;}',
'.msp-ticker-item b{color:#1B5E20;}',
'@keyframes mspScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
'@media(max-width:600px){.msp-ticker-label{display:none;}.msp-ticker-track{animation-duration:30s;}}',
''
].join('\n');
if (!c.includes('msp-ticker')) { c += css; fs.writeFileSync(cf, c); }
console.log('css done');

// ── 3) app.js: MSP dataset + render functions ──
const af = 'frontend/app.js';
let a = fs.readFileSync(af, 'utf8');

const mspData = `
// ── Official MSP 2025-26 (CACP / Govt of India, PIB Aug 2025) ──
// prev = 2024-25 MSP; msp = 2025-26 MSP; ₹/quintal
const MSP_DATA = [
  // Kharif
  { name:'Paddy (Common)', hi:'धान (सामान्य)', cat:'kharif', msp:2369, prev:2300 },
  { name:'Paddy (Grade A)', hi:'धान (ग्रेड A)', cat:'kharif', msp:2389, prev:2320 },
  { name:'Jowar (Hybrid)', hi:'ज्वार (हाइब्रिड)', cat:'kharif', msp:3699, prev:3371 },
  { name:'Jowar (Maldandi)', hi:'ज्वार (मालदांडी)', cat:'kharif', msp:3749, prev:3421 },
  { name:'Bajra', hi:'बाजरा', cat:'kharif', msp:2775, prev:2625 },
  { name:'Ragi', hi:'रागी', cat:'kharif', msp:4886, prev:4290 },
  { name:'Maize', hi:'मक्का', cat:'kharif', msp:2400, prev:2225 },
  { name:'Arhar (Tur)', hi:'अरहर/तूर', cat:'kharif', msp:8000, prev:7550 },
  { name:'Moong', hi:'मूंग', cat:'kharif', msp:8768, prev:8682 },
  { name:'Urad', hi:'उड़द', cat:'kharif', msp:7800, prev:7400 },
  { name:'Cotton (Medium Staple)', hi:'कपास (मध्यम रेशा)', cat:'kharif', msp:7521, prev:7121 },
  { name:'Cotton (Long Staple)', hi:'कपास (लंबा रेशा)', cat:'kharif', msp:8110, prev:7521 },
  { name:'Groundnut', hi:'मूंगफली', cat:'kharif', msp:7263, prev:6783 },
  { name:'Sunflower Seed', hi:'सूरजमुखी', cat:'kharif', msp:7721, prev:7280 },
  { name:'Soyabean (Yellow)', hi:'सोयाबीन', cat:'kharif', msp:5328, prev:4892 },
  { name:'Sesamum', hi:'तिल', cat:'kharif', msp:10346, prev:9267 },
  { name:'Nigerseed', hi:'राई/रामतिल', cat:'kharif', msp:10052, prev:8717 },
  // Rabi
  { name:'Wheat', hi:'गेहूं', cat:'rabi', msp:2425, prev:2275 },
  { name:'Barley', hi:'जौ', cat:'rabi', msp:1980, prev:1850 },
  { name:'Gram (Chana)', hi:'चना', cat:'rabi', msp:5650, prev:5440 },
  { name:'Masur (Lentil)', hi:'मसूर', cat:'rabi', msp:6700, prev:6425 },
  { name:'Rapeseed & Mustard', hi:'सरसों/राई', cat:'rabi', msp:5950, prev:5650 },
  { name:'Safflower', hi:'कुसुम', cat:'rabi', msp:5940, prev:5800 },
  // Commercial
  { name:'Jute', hi:'जूट', cat:'commercial', msp:4700, prev:4500 },
  { name:'Copra (Milling)', hi:'नारियल खोपरा (मिलिंग)', cat:'commercial', msp:11582, prev:11100 },
  { name:'Copra (Ball)', hi:'नारियल खोपरा (बॉल)', cat:'commercial', msp:12100, prev:11600 }
];
const MSP_CAT_LABEL = { kharif:'Kharif', rabi:'Rabi', commercial:'Commercial' };

function renderMspTicker() {
  const track = document.getElementById('msp-ticker-track');
  if (!track || track.dataset.done) return;
  track.dataset.done = '1';
  const items = MSP_DATA.map(c => '<span class="msp-ticker-item">' + c.name + ' <b>₹' + c.msp.toLocaleString('en-IN') + '</b>/qtl</span>').join('');
  track.innerHTML = items + items; // duplicate for seamless loop
}

function renderMspTable() {
  const tb = document.getElementById('msp-tbody');
  if (!tb) return;
  const q = (document.getElementById('msp-search')?.value || '').toLowerCase();
  const season = document.getElementById('msp-season-filter')?.value || 'all';
  const rows = MSP_DATA.filter(c =>
    (season === 'all' || c.cat === season) &&
    (!q || c.name.toLowerCase().includes(q) || (c.hi || '').includes(q))
  );
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:16px;">No crops found</td></tr>'; return; }
  tb.innerHTML = rows.map((c, i) => {
    const diff = c.msp - c.prev;
    const sign = diff >= 0 ? '+' : '';
    const col = diff >= 0 ? '#2E7D32' : '#C62828';
    const sName = c.cat === 'kharif' ? 'KMS 2025-26' : c.cat === 'rabi' ? 'RMS 2025-26' : '2025-26';
    return '<tr><td>' + (i + 1) + '</td><td><strong>' + c.name + '</strong><br><small style="color:var(--text-muted);">' + c.hi + '</small></td>' +
      '<td>' + MSP_CAT_LABEL[c.cat] + '</td>' +
      '<td><strong>₹' + c.msp.toLocaleString('en-IN') + '</strong></td>' +
      '<td>₹' + c.prev.toLocaleString('en-IN') + '</td>' +
      '<td style="color:' + col + ';font-weight:700;">' + sign + '₹' + Math.abs(diff).toLocaleString('en-IN') + '</td>' +
      '<td><small>' + sName + '</small></td></tr>';
  }).join('');
}
`;

// insert before loadMandiData or near mandi functions — anchor on BIHAR_MANDI_DATA
const mi = a.indexOf('BIHAR_MANDI_DATA');
if (mi === -1) { console.log('mandi anchor miss'); process.exit(1); }
// find start of that statement line
const lineStart = a.lastIndexOf('\n', mi);
a = a.slice(0, lineStart + 1) + mspData + '\n' + a.slice(lineStart + 1);

// hook render on page show — showPage already calls loadMandiData for mandi? check: add to showPage hook
a = a.replace("if (pageId === 'profile')", "if (pageId === 'mandi') { renderMspTicker(); renderMspTable(); }\n  if (pageId === 'profile')");
if (!a.includes("pageId === 'mandi'")) {
  // fallback: call inside loadDashboard once
  a = a.replace('loadUserCount();', 'loadUserCount(); renderMspTicker(); renderMspTable();');
}
fs.writeFileSync(af, a);
console.log('app.js done:', a.includes('renderMspTable'));
