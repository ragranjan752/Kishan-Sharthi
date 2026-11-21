const fs = require('fs');
const f = 'frontend/index.html';
let s = fs.readFileSync(f, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const J = a => a.join(NL);

// 1) Sidebar nav item — before Logout
const logoutNav = '<div class="nav-item" onclick="logout()">';
const li = s.indexOf(logoutNav);
if (li === -1) { console.log('logout nav miss'); process.exit(1); }
s = s.slice(0, li) + '        <div class="nav-item" onclick="showPage(\'profile\',this)"><span class="icon">👤</span> My Profile</div>' + NL + s.slice(li);

// 2) Profile page before page-sos (or before closing app div — use page-sos anchor)
const sosAnchor = '<div class="page" id="page-sos">';
const si = s.indexOf(sosAnchor);
if (si === -1) { console.log('sos miss'); process.exit(1); }

const page = J([
'        <!-- MY PROFILE -->',
'        <div class="page" id="page-profile">',
'          <div class="section-title">👤 My Profile</div>',
'          <p class="section-sub">अपनी जानकारी अपडेट करें — सभी फ़ील्ड वैकल्पिक हैं</p>',
'          <div class="card" style="max-width:640px;">',
'            <div class="form-row">',
'              <div class="input-group">',
'                <label for="pf-name">पूरा नाम</label>',
'                <input type="text" id="pf-name" placeholder="Full Name">',
'              </div>',
'              <div class="input-group">',
'                <label for="pf-email">Email (read-only)</label>',
'                <input type="email" id="pf-email" readonly style="background:var(--bg);color:var(--text-muted);">',
'              </div>',
'            </div>',
'            <div class="form-row">',
'              <div class="input-group">',
'                <label for="pf-phone">मोबाइल नंबर</label>',
'                <input type="tel" id="pf-phone" maxlength="10" placeholder="10 अंकों का मोबाइल नंबर">',
'              </div>',
'            </div>',
'            <div class="form-row">',
'              <div class="input-group">',
'                <label for="pf-state">राज्य / UT</label>',
'                <input type="text" id="pf-state" class="geo-input" placeholder="Select state / UT" autocomplete="off">',
'                <input type="hidden" id="pf-state-code">',
'                <div class="geo-dropdown hidden" id="pf-state-dd"></div>',
'              </div>',
'              <div class="input-group">',
'                <label for="pf-district">जिला</label>',
'                <input type="text" id="pf-district" class="geo-input" placeholder="Select district" autocomplete="off" disabled>',
'                <input type="hidden" id="pf-district-code">',
'                <div class="geo-dropdown hidden" id="pf-district-dd"></div>',
'              </div>',
'            </div>',
'            <div class="form-row">',
'              <div class="input-group">',
'                <label for="pf-subdistrict">उप-जिला / तहसील / तालुका</label>',
'                <input type="text" id="pf-subdistrict" class="geo-input" placeholder="Select sub-district" autocomplete="off" disabled>',
'                <input type="hidden" id="pf-subdistrict-code">',
'                <div class="geo-dropdown hidden" id="pf-subdistrict-dd"></div>',
'              </div>',
'              <div class="input-group">',
'                <label for="pf-village">गाँव</label>',
'                <input type="text" id="pf-village" class="geo-input" placeholder="Village name" autocomplete="off" disabled>',
'                <input type="hidden" id="pf-village-code">',
'                <div class="geo-dropdown hidden" id="pf-village-dd"></div>',
'              </div>',
'            </div>',
'            <div class="form-row">',
'              <div class="input-group">',
'                <label for="pf-land">भूमि (Kattha)</label>',
'                <input type="number" id="pf-land" min="0" step="0.01" placeholder="जैसे 10">',
'              </div>',
'              <div class="input-group">',
'                <label for="pf-crop">मुख्य फसल</label>',
'                <select id="pf-crop">',
'                  <option value="">फसल चुनें</option>',
'                  <option value="Dhan">Dhan (धान)</option>',
'                  <option value="Gehun">Gehun (गेहूं)</option>',
'                  <option value="Makka">Makka (मक्का)</option>',
'                  <option value="Sarson">Sarson (सरसों)</option>',
'                  <option value="Makhana">Makhana (मखाना)</option>',
'                  <option value="Aloo">Aloo (आलू)</option>',
'                  <option value="Tamatar">Tamatar (टमाटर)</option>',
'                  <option value="Kapas">Kapas (कपास)</option>',
'                  <option value="Ganna">Ganna (गन्ना)</option>',
'                  <option value="Chana">Chana (चना)</option>',
'                  <option value="Arhar">Arhar (अरहर)</option>',
'                  <option value="Moong">Moong (मूंग)</option>',
'                  <option value="Moongfali">Moongfali (मूंगफली)</option>',
'                  <option value="Soyabean">Soyabean (सोयाबीन)</option>',
'                  <option value="Jowar">Jowar (ज्वार)</option>',
'                  <option value="Bajra">Bajra (बाजरा)</option>',
'                  <option value="Jau">Jau (जौ)</option>',
'                  <option value="Kela">Kela (केला)</option>',
'                  <option value="Santra">Santra (संतरा)</option>',
'                  <option value="Papita">Papita (पपीता)</option>',
'                  <option value="Baingan">Baingan (बैंगन)</option>',
'                  <option value="Bhindi">Bhindi (भिंडी)</option>',
'                  <option value="Kheera">Kheera (खीरा)</option>',
'                  <option value="Sabzi">Sabzi (सब्जी)</option>',
'                  <option value="Anya">Anya (अन्य)</option>',
'                </select>',
'              </div>',
'            </div>',
'            <button class="btn-primary" id="pf-save" onclick="saveProfile()" style="width:100%;margin-top:8px;">💾 Save Profile</button>',
'          </div>',
'        </div>',
''
]);
s = s.slice(0, si) + page + s.slice(si);
fs.writeFileSync(f, s);
console.log('profile page added');
