const fs = require('fs');
const f = 'frontend/index.html';
let s = fs.readFileSync(f, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';

// 1) First empty hero stat → dynamic user count
const emptyStat = '<div class="hero-stat-num"></div>' + NL + '            <div class="hero-stat-label"></div>';
const first = s.indexOf(emptyStat);
if (first === -1) { console.log('stat1 miss'); process.exit(1); }
s = s.slice(0, first) +
  '<div class="hero-stat-num" id="hero-user-count">…</div>' + NL +
  '            <div class="hero-stat-label">Total Registered Farmers<br><span style="font-size:10px;color:var(--text-muted);">Farmers Joined Kisan Sarthi</span></div>' +
  s.slice(first + emptyStat.length);

// 2) Second empty hero stat → States & UTs covered
const second = s.indexOf(emptyStat);
if (second === -1) { console.log('stat2 miss'); process.exit(1); }
s = s.slice(0, second) +
  '<div class="hero-stat-num">36</div>' + NL +
  '            <div class="hero-stat-label">States &amp; UTs Covered</div>' +
  s.slice(second + emptyStat.length);

// 3) Remove topbar badge (app header) — landing keeps only hero stat
const bi = s.indexOf('id="user-count-badge"');
if (bi !== -1) {
  const start = s.lastIndexOf('<span', bi);
  const end = s.indexOf('</span>', s.indexOf('kिसान जुड़े', bi)) + 8;
  // badge span ends after nested span — find the outer closing: pattern 'किसान जुड़े</span> </span>'
  const outerEnd = s.indexOf('</span>', end) + 8;
  s = s.slice(0, start) + s.slice(outerEnd).replace(/^\s+/, ' ');
}
fs.writeFileSync(f, s);
console.log('hero-user-count:', s.includes('hero-user-count'), '| badge gone:', !s.includes('user-count-badge'));
