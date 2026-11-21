const fs = require('fs');

// 1) index.html — remove topbar ticker, rename card label
let h = fs.readFileSync('frontend/index.html', 'utf8');
h = h.replace(/<div id="topbar-msp"[\s\S]*?<\/div><\/div>\s*(?=<div style="position:relative;">)/, '');
h = h.replace('<div class="stat-label">Wheat MSP</div>', '<div class="stat-label">🏛️ MSP Rate</div>');
h = h.replace('<div class="stat-value">₹2,275</div>', '<div class="stat-value" id="msp-dash-rate">—</div>');
h = h.replace('<div class="stat-sub">/quintal — stable</div>', '<div class="stat-sub" id="msp-dash-info">Govt MSP 2025-26</div>');
fs.writeFileSync('frontend/index.html', h);
console.log('html: ticker gone =', !h.includes('topbar-msp'), '| msp card =', h.includes('msp-dash-rate'));

// 2) app.js — remove tbMsp, add dashboard MSP rotation
let a = fs.readFileSync('frontend/app.js', 'utf8');
a = a.replace(/let tbMspIdx[\s\S]*?function tbMspStart\(\)\{[^}]+\}\n/, '');
a = a.replace('loadUserCount();tbMspStart();', 'loadUserCount();startMspDash();');

// In loadDashboard, stop overwriting card[2] with mandi price — replace that block
const oldBlock = /\/\/ Card 2: Market price[\s\S]*?setStat\(cards\[2\][^\n]*\n/;
a = a.replace(oldBlock, '      // Card 2: MSP rotation handled by startMspDash()\n');
// Fallback path also sets card2 — neutralize
const fb = /setStat\(cards\[2\], '\.stat-value', '—', '\.stat-sub', 'Data currently unavailable'\);/;
a = a.replace(fb, '      // MSP card handled by rotation\n');

const rot = `
// ── Dashboard MSP card rotation (real CACP 2025-26 data) ──
let mspDashIdx = 0, mspDashTimer = null;
function startMspDash() {
  if (mspDashTimer || !window.MSP_DATA || !MSP_DATA.length) return;
  const rateEl = document.getElementById('msp-dash-rate');
  const infoEl = document.getElementById('msp-dash-info');
  if (!rateEl || !infoEl) return;
  const tick = () => {
    const c = MSP_DATA[mspDashIdx % MSP_DATA.length];
    mspDashIdx++;
    rateEl.style.opacity = 0;
    setTimeout(() => {
      rateEl.textContent = '₹' + c.msp.toLocaleString('en-IN') + ' /qtl';
      infoEl.textContent = c.name + ' · ' + (c.cat === 'kharif' ? 'Kharif' : c.cat === 'rabi' ? 'Rabi' : 'Commercial') + ' MSP 2025-26';
      rateEl.style.opacity = 1;
    }, 300);
  };
  tick();
  mspDashTimer = setInterval(tick, 3500);
}
`;
a = a.replace('function renderMspSlide()', rot + '\nfunction renderMspSlide()');
fs.writeFileSync('frontend/app.js', a);
console.log('app.js: tbMsp gone =', !a.includes('tbMsp'), '| rot =', a.includes('startMspDash'));
