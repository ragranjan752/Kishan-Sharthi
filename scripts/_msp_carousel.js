const fs = require('fs');
const f = 'frontend/index.html';
let s = fs.readFileSync(f, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';

const start = s.indexOf('<!-- MSP SECTION -->');
const endAnchor = '<div class="section-title">📊 Mandi Price Intelligence</div>';
const end = s.indexOf(endAnchor, start);
if (start === -1 || end === -1 || end < start) { console.log('bounds fail', start, end); process.exit(1); }

const carousel = [
'        <!-- MSP CAROUSEL -->',
'        <div class="card" id="msp-carousel" style="margin-bottom:16px;">',
'          <div class="card-title"><span class="dot"></span> 🏛️ Government MSP — 2025-26</div>',
'          <div id="msp-slide" style="text-align:center;padding:14px 8px;min-height:110px;transition:opacity .5s ease,transform .5s ease;">',
'            <div id="msp-crop-name" style="font-size:20px;font-weight:800;color:var(--primary-dark);"></div>',
'            <div id="msp-crop-hi" style="font-size:13px;color:var(--text-muted);margin-top:2px;"></div>',
'            <div id="msp-rate" style="font-size:30px;font-weight:900;color:#1B5E20;margin-top:8px;"></div>',
'            <div id="msp-season" style="font-size:11px;color:var(--text-muted);margin-top:4px;"></div>',
'          </div>',
'          <div style="display:flex;justify-content:center;gap:14px;align-items:center;margin-top:6px;">',
'            <button type="button" onclick="mspNav(-1)" style="border:1.5px solid var(--border);background:#fff;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:14px;">‹</button>',
'            <span id="msp-counter" style="font-size:11px;color:var(--text-muted);"></span>',
'            <button type="button" onclick="mspNav(1)" style="border:1.5px solid var(--border);background:#fff;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:14px;">›</button>',
'          </div>',
'          <p style="font-size:10px;color:var(--text-muted);text-align:center;margin-top:8px;">Official MSP by Govt of India (CACP) · ₹/quintal · Season 2025-26</p>',
'        </div>',
''
].join(NL);

s = s.slice(0, start) + carousel + s.slice(end);
fs.writeFileSync(f, s);
console.log('carousel html done');

// app.js — replace renderMspTicker/renderMspTable with carousel logic
const af = 'frontend/app.js';
let a = fs.readFileSync(af, 'utf8');
const fi = a.indexOf('function renderMspTicker()');
const fe = a.indexOf('async function loadMandi', fi);
if (fi === -1 || fe === -1 || fe < fi) { console.log('js bounds fail', fi, fe); process.exit(1); }

const js = [
'let mspIdx = 0, mspTimer = null;',
'function renderMspSlide() {',
'  const c = MSP_DATA[mspIdx];',
'  if (!c) return;',
"  const slide = document.getElementById('msp-slide');",
"  const nm = document.getElementById('msp-crop-name');",
"  const hi = document.getElementById('msp-crop-hi');",
"  const rt = document.getElementById('msp-rate');",
"  const sn = document.getElementById('msp-season');",
"  const ct = document.getElementById('msp-counter');",
'  if (slide) { slide.style.opacity = 0; slide.style.transform = \'translateY(8px)\'; }',
'  setTimeout(() => {',
"    if (nm) nm.textContent = c.name;",
"    if (hi) hi.textContent = c.hi || '';",
"    if (rt) rt.textContent = '₹' + c.msp.toLocaleString('en-IN') + ' /quintal';",
"    if (sn) sn.textContent = (c.cat === 'kharif' ? 'Kharif Marketing Season' : c.cat === 'rabi' ? 'Rabi Marketing Season' : 'Commercial Crops') + ' · 2025-26 · Prev ₹' + c.prev.toLocaleString('en-IN');",
"    if (ct) ct.textContent = (mspIdx + 1) + ' / ' + MSP_DATA.length;",
'    if (slide) { slide.style.opacity = 1; slide.style.transform = \'translateY(0)\'; }',
'  }, 250);',
'}',
'function mspStart() {',
'  if (mspTimer) clearInterval(mspTimer);',
'  mspTimer = setInterval(() => { mspIdx = (mspIdx + 1) % MSP_DATA.length; renderMspSlide(); }, 3500);',
'}',
'function mspNav(dir) {',
'  mspIdx = (mspIdx + dir + MSP_DATA.length) % MSP_DATA.length;',
'  renderMspSlide();',
'  mspStart();',
'}',
'function renderMspTicker() { renderMspSlide(); mspStart(); }',
'function renderMspTable() {}',
''
].join('\n');

a = a.slice(0, fi) + js + a.slice(fe);
// hook: mandi page show already calls renderMspTicker via earlier patch — ensure it also calls renderMspTable (now noop) fine
fs.writeFileSync(af, a);
console.log('js carousel done');
