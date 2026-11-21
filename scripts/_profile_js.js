const fs = require('fs');
const f = 'frontend/app.js';
let s = fs.readFileSync(f, 'utf8');

const code = `
// ── My Profile / Edit Profile ──
let pfPickers = null;
function initProfileGeo() {
  if (pfPickers) return pfPickers;
  let stCode = null, dtCode = null, sdCode = null;

  const villagePicker = makeGeoPicker({
    inputId: 'pf-village', ddId: 'pf-village-dd', codeId: 'pf-village-code',
    loadingText: 'Loading villages…', emptyText: 'No villages found', disabledPlaceholder: 'Select sub-district first',
    serverSearch: true,
    getOptions: async (q) => {
      if (!sdCode) return [];
      const qq = q ? '&q=' + encodeURIComponent(q) : '';
      const list = await geoApi('/api/locations/villages?subdistrictCode=' + sdCode + '&limit=50' + qq);
      return list.map(v => ({ code: v.village_code, name: v.name }));
    },
  });
  const subdistrictPicker = makeGeoPicker({
    inputId: 'pf-subdistrict', ddId: 'pf-subdistrict-dd', codeId: 'pf-subdistrict-code',
    loadingText: 'Loading sub-districts…', emptyText: 'No sub-districts found', disabledPlaceholder: 'Select district first',
    getOptions: async () => {
      if (!dtCode) return [];
      const list = await geoApi('/api/locations/subdistricts?districtCode=' + dtCode);
      return list.map(b => ({ code: b.subdistrict_code, name: b.name }));
    },
    onPick: (item) => { sdCode = item.code; villagePicker.enable(); villagePicker.reset(); villagePicker.enable(); },
  });
  const districtPicker = makeGeoPicker({
    inputId: 'pf-district', ddId: 'pf-district-dd', codeId: 'pf-district-code',
    loadingText: 'Loading districts…', emptyText: 'No districts found', disabledPlaceholder: 'Select state first',
    getOptions: async () => {
      if (!stCode) return [];
      const list = await geoApi('/api/locations/districts?stateCode=' + stCode);
      return list.map(d => ({ code: d.district_code, name: d.name }));
    },
    onPick: (item) => { dtCode = item.code; sdCode = null; subdistrictPicker.reset(); subdistrictPicker.enable(); villagePicker.reset(); },
  });
  const statePicker = makeGeoPicker({
    inputId: 'pf-state', ddId: 'pf-state-dd', codeId: 'pf-state-code',
    loadingText: 'Loading states…', emptyText: 'No states found',
    getOptions: async () => {
      const list = await geoApi('/api/locations/states');
      return list.map(x => ({ code: x.state_code, name: x.name }));
    },
    onPick: (item) => {
      stCode = item.code; dtCode = null; sdCode = null;
      districtPicker.reset(); districtPicker.enable();
      subdistrictPicker.reset(); villagePicker.reset();
    },
  });
  pfPickers = { statePicker, districtPicker, subdistrictPicker, villagePicker };
  return pfPickers;
}

async function initProfileForm() {
  const u = currentUser || {};
  const set = (id, v) => { const el = document.getElementById(id); if (el && v != null && v !== 'Not specified') el.value = v; };
  set('pf-name', u.name);
  set('pf-email', u.email);
  set('pf-phone', u.phone);
  set('pf-land', u.land_size_kattha);
  set('pf-crop', u.primary_crop);
  try {
    const token = getAuthToken();
    if (token) {
      const res = await fetch('/api/farmers/me', { headers: { Authorization: 'Bearer ' + token } });
      const j = await readApiJson(res);
      const farmer = (j && (j.data && (j.data.farmer || j.data) || j.farmer)) || {};
      ['name','email','phone','state','district','block','subdistrict','village','land_size_kattha','primary_crop'].forEach(k => {
        if (farmer[k] != null) u[k] = farmer[k];
      });
      ['state_code','district_code','subdistrict_code','village_code'].forEach(k => { if (farmer[k] != null) u[k] = farmer[k]; });
    }
  } catch (e) { console.log('profile fetch:', e.message); }
  set('pf-name', u.name); set('pf-email', u.email); set('pf-phone', u.phone); set('pf-land', u.land_size_kattha); set('pf-crop', u.primary_crop);

  const pickers = initProfileGeo();
  const fillName = (id, codeId, name) => {
    const el = document.getElementById(id), c = document.getElementById(codeId);
    if (el && name && name !== 'Not specified') el.value = name;
    if (c && u[codeId.replace('-code','')] !== undefined) {}
  };
  // Prefill names + codes from saved profile
  const map = [['pf-state','pf-state-code','state','state_code'],['pf-district','pf-district-code','district','district_code'],['pf-subdistrict','pf-subdistrict-code','subdistrict','subdistrict_code'],['pf-village','pf-village-code','village','village_code']];
  map.forEach(([iid,cid,nk,ck]) => {
    const el = document.getElementById(iid), c = document.getElementById(cid);
    const nm = u[nk] || (nk === 'subdistrict' ? u.block : null);
    if (el && nm && nm !== 'Not specified') { el.value = nm; el.disabled = false; }
    if (c && u[ck]) c.value = u[ck];
  });
  // Rebuild picker internal codes from hidden fields so cascade works
  // (pickers keep their own code vars; prefill names only — user can re-pick to set codes)
}

async function saveProfile() {
  const btn = document.getElementById('pf-save');
  const name = document.getElementById('pf-name').value.trim();
  const phone = document.getElementById('pf-phone').value.trim();
  const state = document.getElementById('pf-state').value.trim();
  const district = document.getElementById('pf-district').value.trim();
  const subdistrict = document.getElementById('pf-subdistrict').value.trim();
  const village = document.getElementById('pf-village').value.trim();
  const land = document.getElementById('pf-land').value;
  const crop = document.getElementById('pf-crop').value;
  const num = (id) => { const v = parseInt(document.getElementById(id).value, 10); return Number.isFinite(v) ? v : null; };

  if (phone && !/^[6-9]\\d{9}$/.test(phone)) { showToast('⚠️ मान्य 10-अंकीय मोबाइल नंबर दर्ज करें', 'error'); return; }
  btn.disabled = true; btn.textContent = '⏳ Saving…';
  try {
    const token = getAuthToken();
    const res = await fetch('/api/farmers/' + (currentUser.id || currentUser.uid), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        name: name || undefined,
        phone: phone || undefined,
        state: state || undefined,
        state_code: num('pf-state-code'),
        district: district || undefined,
        district_code: num('pf-district-code'),
        subdistrict: subdistrict || undefined,
        subdistrict_code: num('pf-subdistrict-code'),
        village: village || undefined,
        village_code: num('pf-village-code'),
        land_size_kattha: land ? Number(land) : undefined,
        primary_crop: crop || undefined
      })
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Save failed');
    const farmer = (data.data && (data.data.farmer || data.data)) || {};
    currentUser = { ...currentUser, ...farmer };
    sessionStorage.setItem('ks_user', JSON.stringify(currentUser));
    showToast('✅ Profile saved!', 'success');
  } catch (e) {
    showToast('❌ ' + (e.message || 'Save failed'), 'error');
  } finally {
    btn.disabled = false; btn.textContent = '💾 Save Profile';
  }
}
`;

// insert before showPage definition
const anchor = 'function showPage(pageId, elem)';
const pos = s.indexOf(anchor);
if (pos === -1) { console.log('anchor miss'); process.exit(1); }
s = s.slice(0, pos) + code + '\n' + s.slice(pos);

// hook profile init into showPage — find the switch/default page loader inside showPage
// add a line that calls initProfileForm when pageId==='profile'
s = s.replace(/(if \(pageId === 'dashboard'\)[^\n]*\n?)/, "$1  if (pageId === 'profile') initProfileForm();\n");
// fallback: if that pattern didn't match, inject after function open
if (!s.includes("initProfileForm();")) {
  const fp = s.indexOf(anchor);
  const fe = s.indexOf('{', fp);
  s = s.slice(0, fe + 1) + "\n  if (pageId === 'profile') initProfileForm();" + s.slice(fe + 1);
}
fs.writeFileSync(f, s);
console.log('profile js added');
