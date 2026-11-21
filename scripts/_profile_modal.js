const fs = require('fs');
const f = 'frontend/index.html';
let s = fs.readFileSync(f, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const J = a => a.join(NL);

// 1) Remove My Profile nav item
s = s.replace(/\s*<div class="nav-item" onclick="showPage\('profile',this\)"><span class="icon">👤<\/span> My Profile<\/div>/, '');

// 2) Add avatar dropdown in topbar-right before lang badge
const badgeAnchor = '<span id="user-count-badge"';
const bi = s.indexOf(badgeAnchor);
if (bi === -1) { console.log('badge miss'); process.exit(1); }
const dropdown = J([
'          <div style="position:relative;">',
'            <div class="user-avatar" id="topbar-avatar" onclick="toggleProfileMenu(event)" title="Profile" style="cursor:pointer;width:36px;height:36px;font-size:14px;">K</div>',
'            <div id="profile-menu" style="display:none;position:absolute;right:0;top:calc(100% + 8px);background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12);width:240px;z-index:200;overflow:hidden;">',
'              <div style="padding:14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">',
'                <div id="pm-avatar" class="user-avatar" style="width:40px;height:40px;font-size:15px;flex-shrink:0;">K</div>',
'                <div style="min-width:0;">',
'                  <div id="pm-name" style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Farmer</div>',
'                  <div id="pm-email" style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">—</div>',
'                </div>',
'              </div>',
'              <button type="button" onclick="openProfileModal()" style="width:100%;text-align:left;padding:11px 14px;border:none;background:none;font-size:13px;cursor:pointer;display:flex;gap:8px;align-items:center;">✏️ Edit Profile</button>',
'              <button type="button" onclick="logout()" style="width:100%;text-align:left;padding:11px 14px;border:none;background:none;font-size:13px;cursor:pointer;display:flex;gap:8px;align-items:center;color:var(--red);border-top:1px solid var(--border);">🚪 Logout</button>',
'            </div>',
'          </div>'
]) + NL;
s = s.slice(0, bi) + dropdown + s.slice(bi);

// 3) Convert page-profile into modal — extract inner card content
const ps = s.indexOf('<!-- MY PROFILE -->');
const pe = s.indexOf('<div class="page" id="page-sos">');
if (ps === -1 || pe === -1 || pe < ps) { console.log('profile page bounds miss', ps, pe); process.exit(1); }
const block = s.slice(ps, pe);
// inner card starts at '<div class="card"' and page wrapper ends before it
const cardStart = block.indexOf('<div class="card"');
const inner = block.slice(cardStart).replace(/\s*<\/div>\s*$/, NL + '        </div>' + NL); // keep card close
// Build modal markup
const modal = J([
'        <!-- PROFILE MODAL -->',
'        <div id="profile-modal" onclick="if(event.target===this)closeProfileModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;align-items:center;justify-content:center;padding:16px;overflow-y:auto;">',
'          <div style="background:#fff;border-radius:14px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;padding:20px;position:relative;">',
'            <button type="button" onclick="closeProfileModal()" style="position:absolute;top:12px;right:14px;border:none;background:var(--primary-pale);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;">✕</button>',
'            <div class="section-title" style="margin-bottom:4px;">👤 Edit Profile</div>',
'            <p class="section-sub" style="margin-bottom:12px;">अपनी जानकारी अपडेट करें — सभी फ़ील्ड वैकल्पिक हैं</p>',
inner,
'          </div>',
'        </div>',
''
]);
s = s.slice(0, ps) + modal + s.slice(pe);
fs.writeFileSync(f, s);
console.log('profile modal done');
