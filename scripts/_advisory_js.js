const fs = require('fs');
const f = 'frontend/app.js';
let s = fs.readFileSync(f, 'utf8');
const NL = '\n';

// 1) Insert loadAdvisory before loadDashboard comment anchor
const anchor = '// ── Dashboard ──';
const ai = s.indexOf(anchor);
if (ai === -1) { console.log('anchor miss'); process.exit(1); }

const code = [
'async function loadAdvisory() {',
"  const box = document.getElementById('ai-advisory-content');",
"  const ttl = document.getElementById('ai-advisory-title');",
'  if (!box) return;',
"  box.innerHTML = '<div style=\"color:var(--text-muted);font-size:12px;\">⏳ Loading real advisory for your area…</div>';",
'  try {',
"    const token = getAuthToken();",
"    const res = await fetch('/api/advisory', { headers: token ? { Authorization: 'Bearer ' + token } : {} });",
'    if (!res.ok) throw new Error(\'advisory failed\');',
'    const j = await readApiJson(res);',
'    const d = (j && j.data) ? j.data : j;',
'    if (!d || !d.location) throw new Error(\'no data\');',
'',
"    if (ttl) ttl.textContent = 'AI Advisory — ' + (d.location.label || 'your area') + (d.crop ? ' · ' + d.crop : '');",
'',
'    let html = \'\';',
'    // Weather-based advice',
'    (d.weatherAdvice || []).forEach(a => {',
"      const icon = a.level === 'warn' ? '⚠️' : a.level === 'ok' ? '✅' : '🌦️';",
"      html += '<div style=\"margin:6px 0;\">' + icon + ' <strong>' + a.type + ':</strong> ' + a.text + '</div>';",
'    });',
'',
'    // Weather snapshot line',
'    if (d.weather && d.weather.available) {',
"      const w = d.weather;",
"      html += '<div style=\"margin:8px 0;padding:8px;background:var(--primary-pale);border-radius:8px;font-size:12px;\">' +",
"        '🌡️ ' + w.temp + '°C · ' + w.condition + ' · 💧 ' + w.humidity + '% · 🌧️ ' + (w.rainProbability != null ? w.rainProbability + '% rain chance' : '—') +",
"        '<br><small>📍 ' + (w.location || '') + ' · Source: ' + (d.sources.weather || 'Open-Meteo') + ' · ' + new Date(d.generatedAt).toLocaleString() + '</small></div>';",
'    } else {',
"      html += '<div style=\"margin:6px 0;color:var(--text-muted);font-size:12px;\">🌦️ Weather data unavailable for your location.</div>';",
'    }',
'',
'    // Real agri news',
'    if (d.news && d.news.length) {',
"      html += '<div style=\"margin-top:10px;font-weight:700;font-size:12px;\">📰 Latest Agricultural News (' + (d.location.state || 'India') + ')</div>';",
'      d.news.slice(0, 5).forEach(n => {',
"        const dt = n.pubDate ? new Date(n.pubDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';",
"        html += '<div style=\"margin:5px 0;font-size:12px;line-height:1.4;\"><a href=\"' + n.link + '\" target=\"_blank\" style=\"color:var(--primary-dark);text-decoration:none;\">' + n.title + '</a>' +",
"          '<br><small style=\"color:var(--text-muted);\">' + dt + ' · ' + (n.source || 'News') + '</small></div>';",
'      });',
'    } else {',
"      html += '<div style=\"margin-top:8px;color:var(--text-muted);font-size:12px;\">📰 No location-specific news found right now.</div>';",
'    }',
'',
'    // Schemes count',
'    if (d.schemes && d.schemes.count != null) {',
"      html += '<div style=\"margin-top:8px;font-size:12px;\">🏛️ ' + d.schemes.count + ' government schemes available — check Govt Schemes page.</div>';",
'    }',
'',
"    html += '<div style=\"margin-top:10px;font-size:10px;color:var(--text-muted);\">Sources: ' + Object.values(d.sources || {}).join(' · ') + '</div>';",
"    box.innerHTML = html;",
'  } catch (e) {',
"    box.innerHTML = '<div style=\"color:var(--text-muted);font-size:12px;\">Advisory data currently unavailable. Please try again later.</div>';",
'  }',
'}',
'',
''
].join(NL);

s = s.slice(0, ai) + code + s.slice(ai);

// 2) Call loadAdvisory inside loadDashboard after weather update (before 'return;' inside try) — insert before the closing of successful branch
s = s.replace("      // Weather icon mapping", "      loadAdvisory();\n      // Weather icon mapping");
// also call on fallback path end
s = s.replace("  setStat(cards[3], '.stat-value', '4', '.stat-sub', '₹35,000+ benefits matched to profile');\n}", "  setStat(cards[3], '.stat-value', '4', '.stat-sub', '₹35,000+ benefits matched to profile');\n  loadAdvisory();\n}");

fs.writeFileSync(f, s);
console.log('advisory js added:', s.includes('loadAdvisory'));
