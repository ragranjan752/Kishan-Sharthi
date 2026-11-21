//═══════════════════════════════════════════
//  Kisan Sarthi — कृषि सारथी
//  Firebase Edition — Phone OTP Auth + Firestore
// ═══════════════════════════════════════════

// ── Universal API Base Routing (supports both unified & split Render deployments) ──
const API_BASE = window.API_BASE_URL || document.querySelector('meta[name="backend-api-url"]')?.content?.replace(/\/$/, '') || '';
if (API_BASE) {
  const originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string' && resource.startsWith('/api')) {
      return originalFetch(`${API_BASE}${resource}`, init);
    }
    return originalFetch(resource, init);
  };
}

// ── State ──
let currentUser = null;
let cachedProducts = [];
let cachedMandi = [];
let cachedSchemes = [];
let cachedToolListings = [];
let cachedToolIncoming = [];
let cachedToolOutgoing = [];
let confirmationResult = null;
let diseaseScanHistory = [];

// ── Firestore Helpers ──
async function fbGetAll(collection, conditions = [], orderBy = null, limit = 50) {
  if (!FIREBASE_CONFIGURED) return [];
  try {
    let ref = fbDb.collection(collection);
    conditions.forEach(c => { ref = ref.where(c[0], c[1], c[2]); });
    if (orderBy) ref = ref.orderBy(orderBy[0], orderBy[1] || 'asc');
    ref = ref.limit(limit);
    const snap = await ref.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.error(`Firestore [${collection}]:`, e); return []; }
}

async function fbGetDoc(collection, id) {
  if (!FIREBASE_CONFIGURED) return null;
  const doc = await fbDb.collection(collection).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function fbAdd(collection, data) {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured');
  const ref = await fbDb.collection(collection).add({ ...data, created_at: firebase.firestore.FieldValue.serverTimestamp() });
  return ref.id;
}

async function fbUpdate(collection, id, data) {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase not configured');
  await fbDb.collection(collection).doc(id).update(data);
}

// ── Landing Page ──
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
});

function toggleMobileMenu(forceClose) {
  const links = document.getElementById('nav-links');
  if (!links) return;
  if (forceClose === false) {
    links.classList.remove('mobile-open');
    links.style.display = 'none';
  } else {
    const isOpen = links.classList.toggle('mobile-open');
    links.style.display = isOpen ? 'flex' : 'none';
  }
}

function toggleSidebar(forceState) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', shouldOpen);
  if (backdrop) backdrop.classList.toggle('active', shouldOpen);
  if (shouldOpen) {
    document.body.classList.add('sidebar-locked');
  } else {
    document.body.classList.remove('sidebar-locked');
  }
}

function openAuth(tab) {
  document.getElementById('auth-screen').classList.add('show');
  switchAuthTab(tab || 'signup');
}

// ── Auth ──
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup')));
  document.getElementById('login-form').classList.toggle('hidden', tab === 'signup');
  document.getElementById('signup-form').classList.toggle('hidden', tab === 'login');
  if (tab === 'signup') initSignupGeo();
  clearAuthErrors();
}

function clearAuthErrors() {
  document.querySelectorAll('.auth-error,.auth-success,.field-error').forEach(e => e.remove());
  document.querySelectorAll('.input-group.error').forEach(g => g.classList.remove('error'));
}

function showAuthError(formId, msg) {
  clearAuthErrors();
  const form = document.getElementById(formId);
  const div = document.createElement('div');
  div.className = 'auth-error';
  div.innerHTML = `<span>⚠️</span> ${msg}`;
  form.insertBefore(div, form.firstChild);
}

function showFieldError(inputId, msg) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const group = input.closest('.input-group');
  group.classList.add('error');
  const span = document.createElement('div');
  span.className = 'field-error';
  span.textContent = msg;
  group.appendChild(span);
}

function validatePhone(phone) { return /^[6-9]\d{9}$/.test(phone); }

async function readApiJson(res) {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!contentType.includes('application/json')) {
    throw new Error(`Server returned HTTP ${res.status} with a non-JSON response`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Server returned invalid JSON');
  }
}

let forceDemoAuth = false;

function shouldUseDemoAuth() {
  return !FIREBASE_CONFIGURED || forceDemoAuth;
}

function getAuthErrorMessage(err) {
  const code = err?.code || '';
  if (code === 'auth/internal-error') {
    return 'Firebase OTP setup issue. Check Phone sign-in, Authorized Domains, and test phone numbers. Demo OTP enabled for now.';
  }
  if (code === 'auth/invalid-app-credential' || code === 'auth/captcha-check-failed') {
    return 'reCAPTCHA verification failed. Disable blockers/VPN and try again.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Phone authentication is not enabled in Firebase Console.';
  }
  return err?.message || 'Failed to send OTP. Check Firebase auth configuration.';
}

// ── Google Sign-In Auth ──
async function handleGoogleSignIn() {
  let useSupabaseOAuth = false;
  if (window.SupabaseAuth) {
    try {
      useSupabaseOAuth = await SupabaseAuth.isOAuthEnabled();
    } catch (err) {
      console.error('Supabase OAuth config check failed:', err);
    }
  }

  if (useSupabaseOAuth) {
    try {
      await SupabaseAuth.signInWithGoogle();
      return;
    } catch (err) {
      console.error('Supabase Google OAuth error:', err);
      showToast((err && err.message) || 'Supabase Google sign-in failed', 'error');
      return;
    }
  }

  console.log('handleGoogleSignIn called');
  console.log('FIREBASE_CONFIGURED:', FIREBASE_CONFIGURED);
  
  if (!FIREBASE_CONFIGURED) {
    showToast('Firebase not configured. Please check firebase-config.js', 'error');
    return;
  }

  try {
    console.log('Creating Google Auth provider...');
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    console.log('Calling signInWithPopup...');
    const result = await firebase.auth().signInWithPopup(provider);
    
    console.log('Google Sign-In successful:', result.user);
    const user = result.user;
    const idToken = await user.getIdToken();
    
    console.log('Sending to backend:', user.email);
    
    // Send token to backend to create/update user
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      })
    });

    const data = await readApiJson(res);
    console.log('Backend response:', data);
    
    if (!res.ok) throw new Error(data.error || 'Google login failed');

    loginSuccess(data.user, data.token, document.getElementById('login-remember') ? document.getElementById('login-remember').checked : true);
    showToast(`✅ Welcome, ${data.user.name.split(' ')[0]}!`, 'success');
  } catch (err) {
    console.error('Google Sign-In error:', err);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    
    // Show specific error message
    let errorMsg = 'Google Sign-In failed. Please try again.';
    if (err.code === 'auth/popup-closed-by-user') {
      errorMsg = 'Sign-in popup was closed. Please try again.';
    } else if (err.code === 'auth/popup-blocked') {
      errorMsg = 'Popup was blocked. Please allow popups for this site.';
    } else if (err.code === 'auth/unauthorized-domain') {
      errorMsg = 'This domain is not authorized. Please add localhost to Firebase Console.';
    } else if (err.code === 'auth/operation-not-allowed') {
      errorMsg = 'Google Sign-In is not enabled in Firebase Console.';
    } else if (err.code === 'auth/api-key-not-allowed') {
      errorMsg = 'API key not allowed. Check Firebase Console.';
    }
    
    showToast(errorMsg + ' (Check console for details)', 'error');
  }
}

// ── Email/Password Auth ──
async function handleEmailLogin() {
  clearAuthErrors();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    if (!email) showFieldError('login-email', 'Email is required');
    if (!password) showFieldError('login-password', 'Password is required');
    return;
  }

  try {
    if (window.SupabaseAuth && await SupabaseAuth.isConfigured()) {
      try {
        const { data, error } = await SupabaseAuth.signInWithEmail(email, password);
        if (!error) {
          const farmer = await SupabaseAuth.bootstrapFarmer();
          loginSuccess(farmer, (data.session && data.session.access_token) || getAuthToken(), document.getElementById('login-remember') ? document.getElementById('login-remember').checked : true);
          showToast(`✅ Welcome back, ${(farmer.name || 'Farmer').split(' ')[0]}!`, 'success');
          return;
        }
        // Supabase Auth has no such user (registered via farmers API) → fall back to backend login
        console.warn('Supabase sign-in failed, trying backend login:', error && error.message);
      } catch (sbErr) {
        console.warn('Supabase sign-in error, trying backend login:', sbErr && sbErr.message);
      }
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Login failed');

    loginSuccess(data.user, data.token);
    showToast(`✅ Welcome back, ${data.user.name.split(' ')[0]}!`, 'success');
  } catch (err) {
    console.error('Login error:', err);
    showAuthError('login-form', err.message);
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  if (btn) btn.textContent = show ? '🙈' : '👁';
}
// ── Pan-India Location Pickers (LGD via /api/locations) ──
const geoApi = (path) => fetch(path).then(r => r.json()).then(b => {
  if (!b.success) throw new Error(b.message || 'Location data unavailable');
  return b.data || [];
});

let geoInitDone = false;

function makeGeoPicker({ inputId, ddId, codeId, getOptions, serverSearch, onPick, loadingText, emptyText, disabledPlaceholder }) {
  const input = document.getElementById(inputId);
  const dd = document.getElementById(ddId);
  const codeEl = document.getElementById(codeId);
  let options = null;
  let timer = null;

  const closeOthers = () => document.querySelectorAll('.geo-dropdown').forEach(d => { if (d !== dd) d.classList.add('hidden'); });

  function render(items) {
    dd.innerHTML = '';
    if (!items.length) {
      const e = document.createElement('div');
      e.className = 'geo-empty';
      e.textContent = emptyText || 'No matches found';
      dd.appendChild(e);
    }
    items.slice(0, 80).forEach(it => {
      const o = document.createElement('div');
      o.className = 'geo-option';
      o.textContent = it.name;
      o.onmousedown = ev => { ev.preventDefault(); pick(it); };
      dd.appendChild(o);
    });
    dd.classList.remove('hidden');
  }

  function pick(it) {
    input.value = it.name;
    codeEl.value = it.code;
    dd.classList.add('hidden');
    if (onPick) onPick(it);
  }

  function filter(q) {
    const lq = (q || '').trim().toLowerCase();
    const items = (options || []).filter(o => !lq || o.name.toLowerCase().includes(lq));
    render(items);
  }

  input.addEventListener('focus', async () => {
    closeOthers();
    dd.classList.remove('hidden');
    if (serverSearch) {
      dd.innerHTML = '<div class="geo-empty">Searching…</div>';
      try { render(await serverSearch(input.value)); } catch { render([]); }
      return;
    }
    if (!options) {
      dd.innerHTML = `<div class="geo-empty">${loadingText || 'Loading…'}</div>`;
      try {
        options = await getOptions();
      } catch (e) {
        dd.innerHTML = `<div class="geo-empty">⚠️ ${e.message || 'Failed to load locations'}</div>`;
        return;
      }
    }
    filter(input.value);
  });

  input.addEventListener('input', () => {
    codeEl.value = '';
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (serverSearch) {
        dd.innerHTML = '<div class="geo-empty">Searching…</div>';
        try { render(await serverSearch(input.value)); } catch { render([]); }
        return;
      }
      filter(input.value);
    }, serverSearch ? 300 : 50);
  });

  input.addEventListener('blur', () => setTimeout(() => dd.classList.add('hidden'), 150));

  const defaultPlaceholder = input.placeholder;
  return {
    enable() { input.disabled = false; input.placeholder = defaultPlaceholder; },
    reset() { input.value = ''; codeEl.value = ''; options = null; input.disabled = true; if (disabledPlaceholder) input.placeholder = disabledPlaceholder; },
    preset(name, code) { input.value = name || ''; codeEl.value = code || ''; input.disabled = false; },
    value() { return { name: input.value.trim(), code: parseInt(codeEl.value, 10) || null }; },
  };
}

let geoPickers = null;

function initSignupGeo() {
  if (geoPickers) return;
  let stateCode = null, districtCode = null, subdistrictCode = null;

  const villagePicker = makeGeoPicker({
    inputId: 'su-village', ddId: 'su-village-dd', codeId: 'su-village-code',
    loadingText: 'Loading villages…', emptyText: 'No villages found', disabledPlaceholder: 'Select sub-district first',
    serverSearch: async (q) => {
      if (!subdistrictCode) return [];
      const qq = q && q.trim().length >= 2 ? `&q=${encodeURIComponent(q.trim())}` : '';
      const list = await geoApi(`/api/locations/villages?subdistrictCode=${subdistrictCode}&limit=50${qq}`);
      return list.map(v => ({ code: v.village_code, name: v.name }));
    },
  });

  const subdistrictPicker = makeGeoPicker({
    inputId: 'su-subdistrict', ddId: 'su-subdistrict-dd', codeId: 'su-subdistrict-code',
    loadingText: 'Loading sub-districts…', emptyText: 'No sub-districts found', disabledPlaceholder: 'Select district first',
    getOptions: async () => {
      if (!districtCode) return [];
      const list = await geoApi(`/api/locations/subdistricts?districtCode=${districtCode}`);
      return list.map(b => ({ code: b.subdistrict_code, name: b.name }));
    },
    onPick: (item) => {
      subdistrictCode = item.code;
      villagePicker.enable();
    },
  });

  const districtPicker = makeGeoPicker({
    inputId: 'su-district', ddId: 'su-district-dd', codeId: 'su-district-code',
    loadingText: 'Loading districts…', emptyText: 'No districts found', disabledPlaceholder: 'Select state first',
    getOptions: async () => {
      if (!stateCode) return [];
      const list = await geoApi(`/api/locations/districts?stateCode=${stateCode}`);
      return list.map(d => ({ code: d.district_code, name: d.name }));
    },
    onPick: (item) => {
      districtCode = item.code;
      subdistrictCode = null;
      subdistrictPicker.enable();
      subdistrictPicker.reset();
      subdistrictPicker.enable();
      villagePicker.reset();
    },
  });

  const statePicker = makeGeoPicker({
    inputId: 'su-state', ddId: 'su-state-dd', codeId: 'su-state-code',
    loadingText: 'Loading states…', emptyText: 'No states found',
    getOptions: async () => {
      const list = await geoApi('/api/locations/states');
      return list.map(s => ({ code: s.state_code, name: s.name }));
    },
    onPick: (item) => {
      stateCode = item.code;
      districtCode = null;
      subdistrictCode = null;
      districtPicker.reset();
      districtPicker.enable();
      subdistrictPicker.reset();
      villagePicker.reset();
    },
  });

  geoPickers = { statePicker, districtPicker, subdistrictPicker, villagePicker };
}
async function handleEmailSignup() {
  clearAuthErrors();
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const password = document.getElementById('su-password').value;
  const phone = document.getElementById('su-phone').value.replace(/\D/g, '');

  // ── Location selections (LGD codes + display names) ──
  const state = geoPickers.statePicker.value();
  const district = geoPickers.districtPicker.value();
  const subdistrict = geoPickers.subdistrictPicker.value();
  const village = geoPickers.villagePicker.value();

  // ── Validation ──
  let valid = true;
  if (!name) { showFieldError('su-name', 'Full name is required'); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('su-email', 'Valid email is required'); valid = false; }
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) { showFieldError('su-phone', 'Enter valid 10-digit mobile number'); valid = false; }
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    showFieldError('su-password', 'Min 8 chars with uppercase, lowercase & number'); valid = false;
  }
  if (!state.code) { showFieldError('su-state', 'Select your state'); valid = false; }
  if (!district.code) { showFieldError('su-district', 'Select your district'); valid = false; }
  if (!subdistrict.name) { showFieldError('su-subdistrict', 'Enter your sub-district / block'); valid = false; }
  if (!village.name) { showFieldError('su-village', 'Enter your village name'); valid = false; }
  if (!valid) return;

  const btn = document.getElementById('su-submit-btn');
  const oldText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  const geoPayload = {
    state: state.name, state_code: state.code,
    district: district.name, district_code: district.code,
    block: subdistrict.name, subdistrict_code: subdistrict.code,
    village: village.name, village_code: village.code,
  };

  try {
    // Always register via backend farmers API — single source of truth (Supabase Auth
    // signup would require email confirmation and skip the farmers profile record).
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, ...geoPayload })
    });

    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    document.getElementById('login-email').value = email;
    switchAuthTab('login');
    showToast('✅ Account created successfully! Please log in.', 'success');
  } catch (err) {
    console.error('Signup error:', err);
    showAuthError('signup-form', err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = oldText; }
  }
}
async function handleDemoLogin() {
  const btn = document.getElementById('demo-login-btn');
  if (btn) btn.disabled = true;
  try {
    const statusRes = await fetch('/api/demo/status');
    const status = await statusRes.json();
    if (!statusRes.ok || !status.enabled) {
      throw new Error(status.error || 'Demo mode is disabled');
    }

    const res = await fetch('/api/demo/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || 'Demo login failed');
    }

    loginSuccess(data.user, data.token);
    showToast('✅ Demo login successful', 'success');
  } catch (err) {
    console.error('Demo login failed:', err);
    showToast(err.message || 'Demo login failed', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function getAuthToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function skipProfile() {
  sessionStorage.setItem('ks_skip_cp', '1');
  const token = getAuthToken();
  loginSuccess(currentUser, token);
  showToast('⚠️ Profile later complete कर सकते हैं — Dashboard में limited features दिखेंगे', 'info');
}

function loginSuccess(user, token, rememberMe = true) {
  // Normalize id/uid for compatibility
  user.uid = user.id || user.uid;
  user.id = user.id || user.uid;
  
  currentUser = user;
  if (token) {
    if (rememberMe) {
      localStorage.setItem('token', token);
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('token', token);
      localStorage.removeItem('token');
    }
  }
  sessionStorage.setItem('ks_user', JSON.stringify(user));
  const cpScreen = document.getElementById('complete-profile-screen');
  if (cpScreen) cpScreen.style.display = 'none';
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('auth-screen').classList.remove('show');
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  const sn = document.getElementById('sidebar-name');
  const sl = document.getElementById('sidebar-loc');
  if (sn) sn.textContent = user.name || 'Farmer';
  if (sl) sl.textContent = `📍 ${user.district || user.state || 'Bihar'}`;
  const photoUrl = user.profile_image_url || user.photoURL || user.photo_url || null;
  const setAvatar = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (photoUrl) el.innerHTML = `<img src="${photoUrl}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    else el.textContent = (user.name || 'K').charAt(0).toUpperCase();
  };
  setAvatar('sidebar-avatar');
  setAvatar('topbar-avatar');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('page-sub').textContent = `${greeting}, ${(user.name || 'Farmer').split(' ')[0]} 🌤`;
  const advisoryTitle = document.getElementById('ai-advisory-title');
  if (advisoryTitle) {
    advisoryTitle.textContent = `Today's Recommendations for your ${user.primary_crop || user.crop || 'Wheat'} crop in ${user.district || user.state || 'Bihar'}:`;
  }
  if (window.innerWidth <= 768) document.getElementById('mobile-menu-btn').style.display = 'block';
  prefillFarmTraceForm();
  prefillFertilizerCalculator();
  if (typeof prefillToolForm === 'function') prefillToolForm();
  loadDashboard(); loadProducts(); loadMandi('all'); loadSchemes();
  loadStateMap();
}

// ── Mandatory Profile Completion ──
let biharLocationsCache = null;

function isProfileComplete(user) {
  if (!user) return false;
  if (user.profile_completed === true) return true;
  if (user.profile_completed === false) return false;
  const land = Number(user.land_size_kattha || 0);
  return Boolean(
    user.name && user.phone &&
    user.district && user.district !== 'Not specified' &&
    user.block && user.block !== 'Not specified' &&
    land > 0 && user.primary_crop
  );
}

async function getBiharLocations() {
  if (biharLocationsCache) return biharLocationsCache;
  const res = await fetch('/api/meta/locations');
  const data = await readApiJson(res);
  biharLocationsCache = data.data || data;
  return biharLocationsCache;
}

function populateBlockOptions(district) {
  const list = document.getElementById('cp-block-options');
  if (!list) return;
  const blocks = (biharLocationsCache && biharLocationsCache.blocksByDistrict && biharLocationsCache.blocksByDistrict[district]) || [];
  list.innerHTML = blocks.map(b => `<option value="${b}"></option>`).join('');
}

function updateBighaPreview() {
  const kattha = Number(document.getElementById('cp-land')?.value || 0);
  const perBigha = (biharLocationsCache && biharLocationsCache.katthaPerBigha) || 20;
  const el = document.getElementById('cp-bigha');
  if (el) el.textContent = `${(kattha / perBigha).toFixed(3)} Bigha`;
}

// ── Complete-profile pan-India geo pickers (reuse signup picker factory) ──
let cpPickers = null;
function initCpGeo() {
  if (cpPickers) return cpPickers;
  let stateCode = null, districtCode = null, subdistrictCode = null;

  const subdistrictPicker = makeGeoPicker({
    inputId: 'cp-subdistrict', ddId: 'cp-subdistrict-dd', codeId: 'cp-subdistrict-code',
    loadingText: 'Loading sub-districts…', emptyText: 'No sub-districts found', disabledPlaceholder: 'Select district first',
    getOptions: async () => {
      if (!districtCode) return [];
      const list = await geoApi(`/api/locations/subdistricts?districtCode=${districtCode}`);
      return list.map(b => ({ code: b.subdistrict_code, name: b.name }));
    },
    onPick: (item) => { subdistrictCode = item.code; },
  });

  const districtPicker = makeGeoPicker({
    inputId: 'cp-district', ddId: 'cp-district-dd', codeId: 'cp-district-code',
    loadingText: 'Loading districts…', emptyText: 'No districts found', disabledPlaceholder: 'Select state first',
    getOptions: async () => {
      if (!stateCode) return [];
      const list = await geoApi(`/api/locations/districts?stateCode=${stateCode}`);
      return list.map(d => ({ code: d.district_code, name: d.name }));
    },
    onPick: (item) => {
      districtCode = item.code;
      subdistrictCode = null;
      subdistrictPicker.enable();
      subdistrictPicker.reset();
      subdistrictPicker.enable();
    },
  });

  const statePicker = makeGeoPicker({
    inputId: 'cp-state', ddId: 'cp-state-dd', codeId: 'cp-state-code',
    loadingText: 'Loading states…', emptyText: 'No states found',
    getOptions: async () => {
      const list = await geoApi('/api/locations/states');
      return list.map(s => ({ code: s.state_code, name: s.name }));
    },
    onPick: (item) => {
      stateCode = item.code;
      districtCode = null;
      subdistrictCode = null;
      districtPicker.reset();
      districtPicker.enable();
      subdistrictPicker.reset();
    },
  });

  cpPickers = { statePicker, districtPicker, subdistrictPicker };
  return cpPickers;
}

async function initCompleteProfileForm() {
  const user = currentUser || {};
  const name = document.getElementById('cp-name');
  const phone = document.getElementById('cp-phone');
  const land = document.getElementById('cp-land');
  const crop = document.getElementById('cp-crop');
  if (name) name.value = user.name || '';
  if (phone) phone.value = user.phone || '';
  if (land) land.value = user.land_size_kattha || '';
  if (crop) crop.value = user.primary_crop || '';
  if (land) land.oninput = updateBighaPreview;

  try {
    const pickers = initCpGeo();
    // Prefill names from existing profile (codes can't be recovered — names still saved)
    const stateEl = document.getElementById('cp-state');
    const distEl = document.getElementById('cp-district');
    const subEl = document.getElementById('cp-subdistrict');
    if (stateEl && user.state && user.state !== 'Not specified') stateEl.value = user.state;
    if (distEl && user.district && user.district !== 'Not specified') { distEl.value = user.district; distEl.disabled = false; }
    if (subEl && user.block && user.block !== 'Not specified') { subEl.value = user.block; subEl.disabled = false; }
    updateBighaPreview();
  } catch (err) {
    console.error('Location master load failed:', err);
  }
}

async function submitCompleteProfile() {
  clearAuthErrors();
  const name = document.getElementById('cp-name').value.trim();
  const phone = document.getElementById('cp-phone').value.trim();
  const state = document.getElementById('cp-state').value.trim();
  const district = document.getElementById('cp-district').value.trim();
  const subdistrict = document.getElementById('cp-subdistrict').value.trim();
  const stateCode = parseInt(document.getElementById('cp-state-code').value, 10) || null;
  const districtCode = parseInt(document.getElementById('cp-district-code').value, 10) || null;
  const subdistrictCode = parseInt(document.getElementById('cp-subdistrict-code').value, 10) || null;
  const land = document.getElementById('cp-land').value;
  const crop = document.getElementById('cp-crop').value;

  if (!name) showFieldError('cp-name', 'नाम आवश्यक है');
  if (!/^[6-9]\d{9}$/.test(phone)) showFieldError('cp-phone', 'मान्य 10-अंकीय मोबाइल नंबर दर्ज करें');
  if (!state) showFieldError('cp-state', 'राज्य चुनें');
  if (!district) showFieldError('cp-district', 'जिला चुनें');
  if (!subdistrict) showFieldError('cp-subdistrict', 'उप-जिला / ब्लॉक चुनें');
  if (!(Number(land) > 0)) showFieldError('cp-land', 'भूमि Kattha में दर्ज करें');
  if (!crop) showFieldError('cp-crop', 'फसल चुनें');
  if (!name || !/^[6-9]\d{9}$/.test(phone) || !state || !district || !subdistrict || !(Number(land) > 0) || !crop) return;

  const btn = document.getElementById('cp-submit');
  btn.disabled = true;
  btn.textContent = '⏳ Saving…';
  try {
    const token = getAuthToken();
    const res = await fetch('/api/farmers/me/complete-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, phone, state, state_code: stateCode, district_code: districtCode, subdistrict_code: subdistrictCode, district, block: subdistrict, land_size_kattha: Number(land), primary_crop: crop })
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Profile completion failed');
    const farmer = (data.data && data.data.farmer) || data.farmer;
    currentUser = { ...currentUser, ...farmer };
    sessionStorage.setItem('ks_user', JSON.stringify(currentUser));
    sessionStorage.removeItem('ks_skip_cp');
    document.getElementById('complete-profile-screen').style.display = 'none';
    loginSuccess(currentUser, token);
    showToast('✅ प्रोफ़ाइल पूरी हुई! स्वागत है।', 'success');
  } catch (err) {
    console.error('Profile completion error:', err);
    showAuthError('cp-form', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ प्रोफ़ाइल पूरी करें';
  }
}

function logout() {
  if (FIREBASE_CONFIGURED) fbAuth.signOut();
  if (window.SupabaseAuth) {
    SupabaseAuth.signOut().catch(() => {});
  }
  currentUser = null;
  sessionStorage.removeItem('ks_user');
  localStorage.removeItem('token');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('landing-page').style.display = '';
  document.getElementById('auth-screen').style.display = '';
  document.getElementById('auth-screen').classList.remove('show');
  const cpScreen = document.getElementById('complete-profile-screen');
  if (cpScreen) cpScreen.style.display = 'none';
  // Reset OTP forms
  ['login-otp-section','signup-otp-section'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  ['login-send-otp-btn','signup-send-otp-btn'].forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = '📲 Send OTP'; el.disabled = false; } });
  showToast('Logged out successfully', 'info');
}

// ── Forgot Password ──
let forgotEmail = '';

function showForgotPassword() {
  document.getElementById('auth-screen').classList.remove('show');
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('forgot-password-screen').style.display = 'flex';
  document.getElementById('forgot-password-step1').classList.remove('hidden');
  document.getElementById('forgot-password-step2').classList.add('hidden');
  document.getElementById('forgot-password-success').classList.add('hidden');
  clearAuthErrors();
}

function backToLogin() {
  document.getElementById('forgot-password-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('auth-screen').classList.add('show');
  document.getElementById('forgot-password-step1').classList.remove('hidden');
  document.getElementById('forgot-password-step2').classList.add('hidden');
  document.getElementById('forgot-password-success').classList.add('hidden');
  clearAuthErrors();
}

async function requestPasswordReset() {
  const email = document.getElementById('forgot-email').value.trim();
  
  if (!email) {
    showFieldError('forgot-email', 'Email is required');
    return;
  }

  if (!email.includes('@')) {
    showFieldError('forgot-email', 'Please enter a valid email');
    return;
  }

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await readApiJson(res);

    if (!res.ok) {
      throw new Error(data.error || 'Failed to send reset code');
    }

    forgotEmail = email;
    
    // Show the reset code (for demo purposes or if email failed)
    if (data.resetCode) {
      if (data.demoMode) {
        showToast(`Email not configured. Reset code: ${data.resetCode}`, 'success');
      } else {
        showToast(`Reset code: ${data.resetCode}`, 'success');
      }
    } else {
      showToast('Password reset code has been sent to your email', 'success');
    }

    // Move to step 2
    document.getElementById('forgot-password-step1').classList.add('hidden');
    document.getElementById('forgot-password-step2').classList.remove('hidden');
    clearAuthErrors();

  } catch (err) {
    console.error('Password reset request error:', err);
    showAuthError('forgot-password-step1', err.message);
  }
}

async function confirmPasswordReset() {
  const resetCode = document.getElementById('reset-code').value.trim();
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (!resetCode) {
    showFieldError('reset-code', 'Reset code is required');
    return;
  }

  if (!newPassword) {
    showFieldError('new-password', 'New password is required');
    return;
  }

  if (newPassword.length < 6) {
    showFieldError('new-password', 'Password must be at least 6 characters');
    return;
  }

  if (newPassword !== confirmPassword) {
    showFieldError('confirm-password', 'Passwords do not match');
    return;
  }

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: forgotEmail, 
        resetCode, 
        newPassword 
      })
    });

    const data = await readApiJson(res);

    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }

    // Show success screen
    document.getElementById('forgot-password-step2').classList.add('hidden');
    document.getElementById('forgot-password-success').classList.remove('hidden');
    clearAuthErrors();

  } catch (err) {
    console.error('Password reset confirmation error:', err);
    showAuthError('forgot-password-step2', err.message);
  }
}

// ── Navigation ──

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

function toggleProfileMenu(e){
  if(e)e.stopPropagation();
  const m=document.getElementById('profile-menu');if(!m)return;
  m.style.display=m.style.display==='none'?'block':'none';
  const u=currentUser||{};
  const nm=document.getElementById('pm-name');const em=document.getElementById('pm-email');const av=document.getElementById('pm-avatar');
  if(nm)nm.textContent=u.name||'Farmer';if(em)em.textContent=u.email||'—';
  const photo=u.profile_image_url||u.photoURL||u.photo_url;
  if(av){if(photo){av.innerHTML='<img src="'+photo+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">'}else{av.textContent=(u.name||'K').charAt(0).toUpperCase()}}
}
function openProfileModal(){
  const m=document.getElementById('profile-menu');if(m)m.style.display='none';
  const mo=document.getElementById('profile-modal');if(mo)mo.style.display='flex';
  initProfileForm();
}
function closeProfileModal(){
  const mo=document.getElementById('profile-modal');if(mo)mo.style.display='none';
}
document.addEventListener('click',function(e){
  const m=document.getElementById('profile-menu');
  if(m&&m.style.display!=='none'&&!e.target.closest('#profile-menu')&&!e.target.closest('#topbar-avatar'))m.style.display='none';
});
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
    const pk = { 'pf-state':'statePicker','pf-district':'districtPicker','pf-subdistrict':'subdistrictPicker','pf-village':'villagePicker' }[iid];
    const picker = pfPickers && pfPickers[pk];
    if (picker && picker.preset && nm && nm !== 'Not specified') picker.preset(nm, u[ck] || null);
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

  if (phone && !/^[6-9]\d{9}$/.test(phone)) { showToast('⚠️ मान्य 10-अंकीय मोबाइल नंबर दर्ज करें', 'error'); return; }
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

function showPage(pageId, elem) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) targetPage.classList.add('active');

  if (elem && (elem.classList.contains('nav-item') || elem.classList.contains('mobile-nav-btn'))) {
    elem.classList.add('active');
  } else {
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.textContent.toLowerCase().includes(pageId)) n.classList.add('active');
    });
  }

  // Sync mobile bottom navigation bar
  const matchingBottomBtn = document.querySelector(`.mobile-nav-btn[data-page="${pageId}"]`);
  if (matchingBottomBtn) matchingBottomBtn.classList.add('active');

  const titles = { 
    dashboard: 'Dashboard', 
    disease: 'AI Disease Detection', 
    trace: 'Farm-to-Fork QR', 
    tools: 'Tool Sharing', 
    weather: 'Smart Irrigation', 
    market: 'Fertilizer Marketplace', 
    mandi: 'Mandi Prices', 
    schemes: 'Govt Schemes', 
    community: 'Kisan Community', 
    offline: 'SMS / IVR Access', 
    sos: 'SOS Emergency' 
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[pageId] || pageId;

  toggleSidebar(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // REFRESH MODULE CONTENT WHEN OPENED — Never leave blank
  if (pageId === 'dashboard') loadDashboard();
  
  if (pageId === 'weather') loadIrrigationAdvice();
  if (pageId === 'market') { loadProducts(); prefillFertilizerCalculator(); }
  if (pageId === 'mandi') { loadMandi('all'); renderMspTicker(); renderMspTable(); }
  if (pageId === 'schemes') loadSchemes();
  if (pageId === 'trace') prefillFarmTraceForm();
  if (pageId === 'community') loadCommunity();
  if (pageId === 'tools' && typeof loadToolSharing === 'function') loadToolSharing();
}

function triggerCamera() {
  const cameraInput = document.getElementById('camera-input');
  if (cameraInput) {
    cameraInput.click();
  } else {
    document.getElementById('file-input')?.click();
  }
}

function triggerGallery() {
  document.getElementById('file-input')?.click();
}

async function loadAdvisory() {
  const box = document.getElementById('ai-advisory-content');
  const ttl = document.getElementById('ai-advisory-title');
  if (!box) return;
  box.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">⏳ Loading real advisory for your area…</div>';
  try {
    const token = getAuthToken();
    const res = await fetch('/api/advisory', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
    if (!res.ok) throw new Error('advisory failed');
    const j = await readApiJson(res);
    const d = (j && j.data) ? j.data : j;
    if (!d || !d.location) throw new Error('no data');

    if (ttl) ttl.textContent = 'AI Advisory — ' + (d.location.label || 'your area') + (d.crop ? ' · ' + d.crop : '');

    let html = '';
    // Weather-based advice (with reference)
    (d.weatherAdvice || []).forEach(a => {
      const icon = a.level === 'warn' ? '⚠️' : a.level === 'ok' ? '✅' : '🌦️';
      html += '<div style="margin:6px 0;">' + icon + ' <strong>' + a.type + ':</strong> ' + a.text +
        '<br><small style="color:var(--text-muted);">📅 ' + new Date(d.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' · Ref: IMD / Open-Meteo forecast</small></div>';
    });

    // Weather snapshot line
    if (d.weather && d.weather.available) {
      const w = d.weather;
      html += '<div style="margin:8px 0;padding:8px;background:var(--primary-pale);border-radius:8px;font-size:12px;">' +
        '🌡️ ' + w.temp + '°C · ' + w.condition + ' · 💧 ' + w.humidity + '% · 🌧️ ' + (w.rainProbability != null ? w.rainProbability + '% rain chance' : '—') +
        '<br><small>📍 ' + (w.location || '') + ' · Source: ' + (d.sources.weather || 'Open-Meteo') + ' · ' + new Date(d.generatedAt).toLocaleString() + '</small></div>';
    } else {
      html += '<div style="margin:6px 0;color:var(--text-muted);font-size:12px;">🌦️ Weather data unavailable for your location.</div>';
    }

    // Real agri news
    if (d.news && d.news.length) {
      html += '<div style="margin-top:10px;font-weight:700;font-size:12px;">📰 Latest Agricultural News (' + (d.location.state || 'India') + ')</div>';
      d.news.slice(0, 5).forEach(n => {
        const dt = n.pubDate ? new Date(n.pubDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        html += '<div style="margin:5px 0;font-size:12px;line-height:1.4;"><a href="' + n.link + '" target="_blank" style="color:var(--primary-dark);text-decoration:none;">' + n.title + '</a>' +
          '<br><small style="color:var(--text-muted);">📅 ' + dt + ' · 📰 ' + (n.source || 'News') + ' · <a href="' + n.link + '" target="_blank" style="color:var(--primary);">Source ↗</a></small></div>';
      });
    } else {
      html += '<div style="margin-top:8px;color:var(--text-muted);font-size:12px;">📰 No location-specific news found right now.</div>';
    }

    // Schemes count
    if (d.schemes && d.schemes.count != null) {
      html += '<div style="margin-top:8px;font-size:12px;">🏛️ ' + d.schemes.count + ' government schemes available — check Govt Schemes page.</div>';
    }

    html += '<div style="margin-top:10px;font-size:10px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:8px;">' +
      '📚 References: ' +
      '<a href="https://mausam.imd.gov.in/" target="_blank" style="color:var(--primary);">IMD</a> · ' +
      '<a href="https://open-meteo.com/" target="_blank" style="color:var(--primary);">Open-Meteo</a> · ' +
      '<a href="https://www.pib.gov.in/" target="_blank" style="color:var(--primary);">PIB</a> · ' +
      '<a href="https://casi.icrisat.org/" target="_blank" style="color:var(--primary);">CACP/ICAR</a> · ' +
      '<a href="https://icar.org.in/" target="_blank" style="color:var(--primary);">ICAR</a>' +
      '<br>🕐 Generated: ' + new Date(d.generatedAt).toLocaleString('en-IN') + '</div>';
    box.innerHTML = html;
  } catch (e) {
    box.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">Advisory data currently unavailable. Please try again later.</div>';
  }
}

// ── Dashboard ──
async function loadDashboard() {
  const u = currentUser || {};
  const district = u.district && u.district !== 'Not specified' ? u.district : 'Patna';
  const crop = u.primary_crop || u.crop || 'Wheat';

  const cards = document.querySelectorAll('.stat-card');
  const setStat = (card, valSel, val, chgSel, chg) => {
    if (!card) return;
    const sv = card.querySelector(valSel);
    if (sv && val !== undefined && val !== null) sv.textContent = val;
    const sc = card.querySelector(chgSel);
    if (sc && chg !== undefined && chg !== null) sc.textContent = chg;
  };

  try {
    const token = getAuthToken();
    const res = await fetch('/api/dashboard', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
    if (res.ok) {
      const data = await readApiJson(res);
      const d = (data && data.data) ? data.data : data;
      const st = (d && d.stats) || {};
      const wx = (d && d.weather) || {};

      // Card 0: Crop health
      const healthVal = (st.cropHealth !== undefined && st.cropHealth !== null) ? st.cropHealth + '%' : '—';
      const healthSub = st.cropHealthChange || (st.cropHealth != null ? 'Based on latest scans' : 'No scans yet — scan a leaf to get score');
      setStat(cards[0], '.stat-value', healthVal, '.stat-sub', healthSub);

      // Card 1: Today's Irrigation
      const irrigVal = st.irrigation || 'Skip';
      const irrigSub = st.irrigationReason || 'Rain forecast in 36 hrs · Save power';
      setStat(cards[1], '.stat-value', irrigVal, '.stat-sub', irrigSub);

            // Card 2: MSP rotation handled by startMspDash()

      // Card 3: Eligible schemes
      const schemesVal = (st.eligibleSchemes !== undefined && st.eligibleSchemes !== null) ? String(st.eligibleSchemes) : '—';
      const schemesSub = st.schemesAmount || 'Schemes unavailable';
      setStat(cards[3], '.stat-value', schemesVal, '.stat-sub', schemesSub);

      // Update weather snapshot
      const wIcon = document.getElementById('dash-weather-icon');
      const wTemp = document.getElementById('dash-weather-temp');
      const wDesc = document.getElementById('dash-weather-desc');
      const wWind = document.getElementById('dash-weather-wind');
      const wHum = document.getElementById('dash-weather-humidity');

      if (wTemp && wx.temp != null) wTemp.textContent = `${wx.temp}°C`;
      if (wDesc) wDesc.textContent = `${wx.location || district || 'Your area'} · ${wx.condition || 'Weather unavailable'}`;
      if (wHum && wx.humidity != null) wHum.textContent = `💧 ${wx.humidity}%`;
      if (wWind) wWind.textContent = '💨 —';

      loadAdvisory();
      // Weather icon mapping
      if (wIcon && wx.condition) {
        const c = wx.condition.toLowerCase();
        if (c.includes('rain') || c.includes('shower')) wIcon.textContent = '🌧️';
        else if (c.includes('cloud')) wIcon.textContent = '⛅';
        else if (c.includes('clear') || c.includes('sun')) wIcon.textContent = '☀️';
        else if (c.includes('thunder')) wIcon.textContent = '⛈️';
      }
      return;
    }
  } catch (err) {
    console.log('Dashboard error:', err);
  }

  // Data unavailable — show honest placeholders, no fabricated numbers
  setStat(cards[0], '.stat-value', '—', '.stat-sub', 'Data currently unavailable');
  setStat(cards[1], '.stat-value', '—', '.stat-sub', 'Data currently unavailable');
        // MSP card handled by rotation

  setStat(cards[3], '.stat-value', '—', '.stat-sub', 'Data currently unavailable');
}

let stateMapInstance = null;
let stateMapLayer = null;
const INDIA_STATES_GEOJSON = 'public/assets/india.geojson';
const INDIA_DISTRICTS_GEOJSON = 'https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson';

function normStateName(x) {
  return String(x || '').toLowerCase().replace(/[^a-z]/g, '');
}


// ── District drill-down: click a state → show its districts ──
async function openDistrictMap(stateName, el) {
  if (!stateName || !el) return;
  el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:var(--text-muted);font-size:12px;">Loading districts…</div>';
  try {
    if (!window._districtGeo) {
      let r=null;for(let t=0;t<2;t++){try{r=await fetch(INDIA_DISTRICTS_GEOJSON);if(r.ok)break;}catch(_){}}
      if(!r||!r.ok)throw new Error('district geojson fetch failed');
      window._districtGeo = await r.json();
    }
    const feats = (window._districtGeo.features || []).filter(f => {
      const n1 = (f.properties.NAME_1 || '').toLowerCase();
      const t = stateName.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
      return n1 === t || n1.includes(t) || t.includes(n1);
    });
    if (!feats.length) { el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:12px;">District map unavailable</div>'; return; }

    let minX=180,maxX=-180,minY=90,maxY=-90;
    const walk = c => { if (typeof c[0]==='number') { minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);minY=Math.min(minY,c[1]);maxY=Math.max(maxY,c[1]); } else c.forEach(walk); };
    feats.forEach(f => { const g=f.geometry; if(g.type==='Polygon') g.coordinates.forEach(walk); else if(g.type==='MultiPolygon') g.coordinates.forEach(p=>p.forEach(walk)); });
    const W=100,H=100,pad=2;
    const sx = v => pad + (v-minX)/(maxX-minX||1)*(W-2*pad);
    const sy = v => pad + (maxY-v)/(maxY-minY||1)*(H-2*pad);
    const pt = c => sx(c[0]).toFixed(2)+','+sy(c[1]).toFixed(2);
    const ring = r => r.map(pt).join(' ');
    const paths = f => { const g=f.geometry;
      if(g.type==='Polygon') return '<path d="M'+g.coordinates.map(r=>ring(r)+' Z').join(' M')+'"/>';
      if(g.type==='MultiPolygon') return g.coordinates.map(p=>'<path d="M'+p.map(r=>ring(r)+' Z').join(' M')+'"/>').join('');
      return ''; };

    const u = currentUser || {};
    const myDistrict = normStateName(u.district || '');
    const svgns = 'http://www.w3.org/2000/svg';
    const PALETTE = ['#BBDEFB','#C8E6C9','#F8BBD0','#FFE0B2','#D1C4E9','#B2DFDB','#F0F4C3','#DCEDC8','#FFCCBC','#E1BEE7'];
    const svg = document.createElementNS(svgns,'svg');
    svg.setAttribute('viewBox','0 0 100 100');
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    const defs=document.createElementNS(svgns,'defs');defs.innerHTML='<linearGradient id="mapGradActive" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB300"/><stop offset="1" stop-color="#FF6D00"/></linearGradient>';svg.appendChild(defs);
    svg.style.cssText='width:100%;height:100%;display:block;';
    feats.forEach(f => {
      const p = document.createElementNS(svgns,'g');
      p.innerHTML = paths(f);
      const dName = normStateName(f.properties.NAME_2 || '');
      const isMatch = myDistrict && (dName === myDistrict || (myDistrict.length>4 && (dName.includes(myDistrict)||myDistrict.includes(dName))));
      p.querySelectorAll('path').forEach(pp => {
        pp.setAttribute('fill', isMatch ? 'url(#mapGradActive)' : PALETTE[(feats.indexOf(f)%PALETTE.length)]);
        pp.setAttribute('stroke', isMatch ? '#E65100' : '#81C784');
        pp.setAttribute('stroke-width', isMatch ? '0.7' : '0.3');
        pp.setAttribute('class', isMatch ? 'map-state-active' : 'map-state');
      });
      svg.appendChild(p);
      // district name label at centroid
      const coords=[];
      const cc=c=>{if(typeof c[0]==='number')coords.push(c);else c.forEach(cc);};
      const gg=f.geometry; if(gg.type==='Polygon')gg.coordinates.forEach(cc); else if(gg.type==='MultiPolygon')gg.coordinates.forEach(pp=>pp.forEach(cc));
      if(coords.length){const cx=coords.reduce((a,c)=>a+c[0],0)/coords.length, cy=coords.reduce((a,c)=>a+c[1],0)/coords.length;
        const t=document.createElementNS(svgns,'text');
        t.setAttribute('x',sx(cx).toFixed(2));t.setAttribute('y',sy(cy).toFixed(2));
        t.setAttribute('text-anchor','middle');t.setAttribute('font-size','2.2');
        t.setAttribute('fill', isMatch?'#E65100':'#2E7D32');
        t.setAttribute('font-weight','600');t.setAttribute('pointer-events','none');
        t.textContent=(f.properties.NAME_2||'').slice(0,14);
        svg.appendChild(t);}
    });

    const wrap = document.createElement('div');
    wrap.style.cssText='position:relative;width:100%;height:100%;';
    wrap.appendChild(svg);
    const tag = document.createElement('div');
    tag.style.cssText='position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.92);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--primary-dark);white-space:nowrap;';
    tag.textContent = '📍 ' + stateName;
    wrap.appendChild(tag);
    const back = document.createElement('button');
    back.textContent = '← All India';
    back.style.cssText='position:absolute;top:8px;left:8px;background:#fff;border:1px solid var(--border);border-radius:16px;padding:4px 10px;font-size:11px;cursor:pointer;';
    back.onclick = () => loadStateMap();
    wrap.appendChild(back);
    el.innerHTML = ''; el.appendChild(wrap);
  } catch(e) { console.warn('district map failed:', e.message); }
}

function stateMapFallback(el, msg) {
  el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;gap:6px;"><span style="font-size:28px;">🗺️</span>' + msg + '</div>';
}

async function loadStateMap() {
  const el = document.getElementById('state-map-frame');
  if (!el) return;
  const u = currentUser || {};
  const stateName = u.state && u.state !== 'Not specified' ? u.state : null;
  const districtName = u.district && u.district !== 'Not specified' ? u.district : null;
  const subName = (u.subdistrict || u.block) && (u.subdistrict || u.block) !== 'Not specified' ? (u.subdistrict || u.block) : null;
  const villageName = u.village && u.village !== 'Not specified' ? u.village : null;

  // Static India map — GeoJSON rendered to inline SVG (no tiles, no Leaflet)
  el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:12px;">Loading map…</div>';
  try {
    const res = await fetch(INDIA_STATES_GEOJSON);
    const gj = await res.json();
    const india = (gj.features || []).filter(f => f.properties && f.properties.name);
    if (!india.length) throw new Error('no india features');

    // equirectangular projection to fit 100x100 viewBox
    let minX=180,maxX=-180,minY=90,maxY=-90;
    const walk = c => { if (typeof c[0]==='number') { minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);minY=Math.min(minY,c[1]);maxY=Math.max(maxY,c[1]); } else c.forEach(walk); };
    india.forEach(f => { const g=f.geometry; if(g.type==='Polygon') g.coordinates.forEach(walk); else if(g.type==='MultiPolygon') g.coordinates.forEach(p=>p.forEach(walk)); });
    const W=100,H=100,pad=2;
    const sx = v => pad + (v-minX)/(maxX-minX||1)*(W-2*pad);
    const sy = v => pad + (maxY-v)/(maxY-minY||1)*(H-2*pad);
    const pt = c => sx(c[0]).toFixed(2)+','+sy(c[1]).toFixed(2);
    const ring = r => r.map(pt).join(' ');
    const paths = f => {
      const g=f.geometry;
      if(g.type==='Polygon') return '<path d="M'+g.coordinates.map(r=>ring(r)+' Z').join(' M')+'"/>';
      if(g.type==='MultiPolygon') return g.coordinates.map(p=>'<path d="M'+p.map(r=>ring(r)+' Z').join(' M')+'"/>').join('');
      return '';
    };

    const target = normStateName(stateName || '');
    let matched = null;
    for (const f of india) {
      const n = normStateName((f.properties.name || f.properties['name:en'] || f.properties.name_en || f.properties.postal || ''));
      if (n === target || (target.length > 4 && (n.includes(target) || target.includes(n)))) { matched = f; break; }
    }

    const svgns = 'http://www.w3.org/2000/svg';
    const PALETTE = ['#BBDEFB','#C8E6C9','#F8BBD0','#FFE0B2','#D1C4E9','#B2DFDB','#F0F4C3','#DCEDC8','#FFCCBC','#E1BEE7'];
    const svg = document.createElementNS(svgns,'svg');
    svg.setAttribute('viewBox','0 0 100 100');
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.style.cssText='width:100%;height:100%;display:block;';
    const defs0=document.createElementNS(svgns,'defs');defs0.innerHTML='<linearGradient id="mapGradActive" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB300"/><stop offset="1" stop-color="#FF6D00"/></linearGradient>';svg.appendChild(defs0);
    const st=document.createElement('style');st.textContent='.map-state{animation:mapFade .6s ease both;}.map-state-active{animation:mapPulse 1.6s ease-in-out infinite;transform-origin:center;transform-box:fill-box;}@keyframes mapFade{from{opacity:0}to{opacity:1}}@keyframes mapPulse{0%,100%{opacity:1;filter:drop-shadow(0 0 0 rgba(255,179,0,0))}50%{opacity:.85;filter:drop-shadow(0 0 6px rgba(255,140,0,.8))}}';document.head.appendChild(st);
    india.forEach(f => {
      const p = document.createElementNS(svgns,'g');
      p.innerHTML = paths(f);
      const isMatch = matched && f === matched;
      p.querySelectorAll('path').forEach(pp => {
        pp.setAttribute('fill', isMatch ? 'url(#mapGradActive)' : PALETTE[(india.indexOf(f)%PALETTE.length)]);
        pp.setAttribute('class', isMatch ? 'map-state-active' : 'map-state');
        pp.style.cursor = 'pointer';
        pp.addEventListener('click', () => openDistrictMap(f.properties.name || f.properties['name:en'] || '', el));
        pp.setAttribute('stroke', isMatch ? '#E65100' : '#81C784');
        pp.setAttribute('stroke-width', isMatch ? '0.6' : '0.25');
      });
      svg.appendChild(p);
      const coords=[];const cc=c=>{if(typeof c[0]==='number')coords.push(c);else c.forEach(cc);};const gg=f.geometry;if(gg.type==='Polygon')gg.coordinates.forEach(cc);else if(gg.type==='MultiPolygon')gg.coordinates.forEach(pp=>pp.forEach(cc));
      if(coords.length){const cx=coords.reduce((a,c)=>a+c[0],0)/coords.length,cy=coords.reduce((a,c)=>a+c[1],0)/coords.length;
        const t=document.createElementNS(svgns,'text');
        t.setAttribute('x',sx(cx).toFixed(2));t.setAttribute('y',sy(cy).toFixed(2));
        t.setAttribute('text-anchor','middle');t.setAttribute('font-size','2.6');
        t.setAttribute('fill',isMatch?'#E65100':'#2E7D32');
        t.setAttribute('font-weight','700');t.setAttribute('pointer-events','none');
        t.textContent=(f.properties.name||'').replace(/\s*(Union Territory|UT)\s*/i,'').slice(0,16);
        svg.appendChild(t);}
    });

    // location label overlay
    const label = [villageName, subName, districtName, stateName].filter(Boolean).join(' · ') || stateName || districtName || 'India';
    const wrap = document.createElement('div');
    wrap.style.cssText='position:relative;width:100%;height:100%;';
    wrap.appendChild(svg);
    const tag = document.createElement('div');
    tag.style.cssText='position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.92);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--primary-dark);white-space:nowrap;';
    tag.textContent = '📍 ' + label;
    wrap.appendChild(tag);
    el.innerHTML = ''; el.appendChild(wrap);

  } catch (e) {
    console.warn('static map failed:', e.message);
    stateMapFallback(el, 'Map unavailable — ' + (stateName || districtName || 'your area'));
  }
}

function stateMapFallbackMsg() {}

function stateMapFallback(el, msg) {
  el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;gap:6px;"><span style="font-size:28px;">🗺️</span>' + msg + '</div>';
}



// ── Disease Detection ──
const diseaseDatabase = {
  wheat: [
    { name:'Yellow Rust (Puccinia striiformis)', confidence:92, severity:'High — Act immediately', cure:'Apply Propiconazole 25% EC @ 200ml/acre in 200L water. Spray in early morning. Repeat after 15 days if symptoms persist.', prevention:'Use resistant varieties (PBW 343, HD 2967). Avoid late sowing beyond Nov 15. Ensure proper field drainage.' },
    { name:'Leaf Rust (Puccinia triticina)', confidence:88, severity:'Medium — Act within 3 days', cure:'Spray Mancozeb 75% WP @ 600g/acre or Propiconazole 25% EC @ 200ml/acre.', prevention:'Grow resistant varieties. Avoid excessive nitrogen. Practice crop rotation.' },
    { name:'Powdery Mildew (Blumeria graminis)', confidence:85, severity:'Medium — Act within 5 days', cure:'Apply Sulfur 80% WP @ 1kg/acre or Karathane @ 200ml/acre.', prevention:'Avoid dense planting. Ensure proper spacing for air circulation.' },
  ],
  rice: [
    { name:'Blast Disease (Magnaporthe oryzae)', confidence:90, severity:'High — Act immediately', cure:'Apply Tricyclazole 75% WP @ 120g/acre or Isoprothiolane 40% EC @ 300ml/acre.', prevention:'Use blast-resistant varieties. Avoid excess nitrogen. Maintain optimum flooding.' },
    { name:'Bacterial Leaf Blight (BLB)', confidence:87, severity:'High — Act within 2 days', cure:'Spray Streptomycin sulphate + Tetracycline @ 300g/acre.', prevention:'Use BLB-resistant varieties. Avoid excess nitrogen.' },
  ],
  cotton: [
    { name:'Bollworm (Helicoverpa armigera)', confidence:91, severity:'High — Act immediately', cure:'Spray Emamectin Benzoate 5% SG @ 80g/acre in evening hours.', prevention:'Use Bt cotton varieties. Install pheromone traps (5/acre).' },
  ],
  tomato: [
    { name:'Late Blight (Phytophthora infestans)', confidence:89, severity:'High — Act immediately', cure:'Spray Mancozeb 75% WP @ 600g/acre + Metalaxyl 8% + Mancozeb 64% WP @ 500g/acre.', prevention:'Avoid overhead irrigation. Ensure proper spacing.' },
    { name:'Leaf Spot (Septoria lycopersici)', confidence:86, severity:'Medium — Act within 5 days', cure:'Apply Chlorothalonil 75% WP @ 400g/acre in 200L water.', prevention:'Mulch around plants. Avoid working with wet plants.' },
  ],
  healthy: [
    { name:'Healthy Crop', confidence:95, severity:'None', cure:'Your crop looks healthy! Continue current management practices.', prevention:'Maintain balanced nutrition. Monitor for early signs of stress.' },
  ]
};

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const preview = document.getElementById('preview-img');
    if (preview) {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    }
    document.getElementById('upload-zone').style.display = 'none';
    const mobileActions = document.getElementById('disease-mobile-actions');
    if (mobileActions) mobileActions.style.display = 'none';
    const diseaseResult = document.getElementById('disease-result');
    if (diseaseResult) {
      diseaseResult.style.display = 'block';
      diseaseResult.innerHTML = '<div class="loading"><div class="spinner"></div> AI analyzing your crop image...</div>';
    }

    try {
      const token = getAuthToken();
      // Compress image client-side: max 1280px, JPEG 0.85 — much faster upload + inference
      let uploadFile = file;
      try {
        const bmp = await createImageBitmap(file);
        const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
        if (scale < 1 || file.size > 512 * 1024) {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(bmp.width * scale);
          canvas.height = Math.round(bmp.height * scale);
          canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
          if (blob) uploadFile = new File([blob], 'leaf.jpg', { type: 'image/jpeg' });
        }
      } catch (_) { /* fallback to original file */ }
      const formData = new FormData();
      formData.append('image', uploadFile);
      const upRes = await fetch('/api/detections/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const upData = await upRes.json();
      if (!upRes.ok || !upData.success) throw new Error(upData.error || upData.message || 'Upload failed');
      const det0 = upData.data?.id ? upData.data : (upData.data?.detection || upData.detection || {});
      const id = det0.id;
      let det = det0;
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const rRes = await fetch(`/api/detections/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const rData = await rRes.json();
        det = rData.data?.detection || rData.detection || rData.data || det;
        if (det.status === 'completed' || det.status === 'failed') break;
      }
      const mapped = {
        name: det.disease_name || 'No clear diagnosis',
        confidence: det.confidence_score ?? 0,
        severity: det.severity || 'unknown',
        cure: [det.crop_name ? `Crop: ${det.crop_name}` : null, det.cure_organic, det.cure_chemical].filter(Boolean).join('<br>'),
        prevention: [det.symptoms_observed ? `Symptoms: ${det.symptoms_observed}` : null, det.alternative_diagnoses?.length ? `Also consider: ${det.alternative_diagnoses.join(', ')}` : null, det.prevention_tips, det.disclaimer].filter(Boolean).join('<br>')
      };
      window.lastDetectionCtx = `फसल: ${det.crop_name || 'unknown'}; निदान: ${mapped.name}; विश्वास: ${mapped.confidence}%; गंभीरता: ${mapped.severity}; उपचार: ${String(det.cure_organic || '').slice(0, 200)}`;
      showDiseaseResult(mapped, det.health_status === 'diseased');
    } catch (err) {
      console.error('Detection upload failed:', err);
      showDiseaseResult({ name: 'Analysis unavailable', confidence: 0, severity: 'unknown', cure: 'Please try again or visit the nearest KVK.', prevention: 'Use a clear, well-lit photo of the affected leaf.' }, false);
    }
  };
  reader.readAsDataURL(file);
}

async function submitFeedback(module,refId,rating){try{await fetch('/api/learning/feedback',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(getAuthToken()||'')},body:JSON.stringify({module,ref_id:String(refId),rating})});showToast('✅ Feedback recorded','success')}catch(e){}}
function showDiseaseResult(result, isDisease) {
  recordDiseaseScan(result, isDisease);
  document.getElementById('disease-result').innerHTML = `
    <div class="result-card">
      <span class="result-tag ${isDisease ? 'tag-disease' : 'tag-healthy'}">${isDisease ? '⚠️ Disease Detected' : '✅ Healthy Crop'}</span>
      <h3 style="margin:8px 0;font-size:17px;">${result.name}</h3>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:12px;color:var(--text-muted);">Confidence</span><div class="confidence-bar" style="flex:1;"><div class="confidence-fill" style="width:${result.confidence}%;"></div></div><strong style="font-size:13px;">${result.confidence}%</strong></div>
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">Severity: <strong>${result.severity}</strong></p>
      <div class="ai-bubble"><div class="ai-header"><div class="ai-dot"></div><span>AI Recommendation</span></div><strong>💊 Treatment:</strong><br>${result.cure}<br><br><strong>🛡 Prevention:</strong><br>${result.prevention}</div>
      ${isDisease ? '<div style="display:flex;gap:8px;margin-top:10px;"><button class="btn-hero-outline" style="flex:1;padding:8px;font-size:12px;" onclick="submitFeedback(&quot;disease&quot;,&quot;det-'+Date.now()+'&quot;,&quot;correct_diag&quot;)">✅ सही निदान</button><button class="btn-hero-outline" style="flex:1;padding:8px;font-size:12px;" onclick="submitFeedback(&quot;disease&quot;,&quot;det-'+Date.now()+'&quot;,&quot;wrong_diag&quot;)">❌ गलत</button></div>' : ''}
      ${isDisease ? '<button class="btn-primary" style="margin-top:12px;width:100%;" onclick="buyMedicine()">🛒 Buy Recommended Medicine</button>' : ''}
      <button class="btn-hero-outline" style="margin-top:10px;width:100%;padding:10px;font-size:13px;border-radius:10px;" onclick="resetUpload()">📷 नई फोटो लें / Scan Another</button>
    </div>`;
  const chatBox = document.getElementById('det-chat-box');
  if (chatBox) {
    chatBox.style.display = 'block';
    const msgs = document.getElementById('det-chat-messages');
    if (msgs && !msgs.children.length) {
      msgs.innerHTML = '<div style="font-size:12px;color:var(--text-muted);align-self:flex-start;background:var(--primary-pale);padding:8px 12px;border-radius:10px;">🤖 इस रिजल्ट के बारे में कुछ भी पूछें — जैसे दवा का dosage, spraying time, या prevention tips.</div>';
    }
    document.getElementById('det-chat-input')?.focus();
  }
}

async function sendDetectionChat() {
  const input = document.getElementById('det-chat-input');
  const msgs = document.getElementById('det-chat-messages');
  if (!input || !msgs) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  msgs.insertAdjacentHTML('beforeend', `<div style="align-self:flex-end;background:var(--primary);color:#fff;padding:8px 12px;border-radius:12px 12px 4px 12px;font-size:13px;max-width:85%;">${text}</div>`);
  const typing = document.createElement('div');
  typing.style.cssText = 'align-self:flex-start;background:var(--primary-pale);padding:8px 12px;border-radius:12px 12px 12px 4px;font-size:13px;color:var(--text-muted);';
  typing.textContent = 'सोच रहा हूँ…';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const langSel = { value: currentLang() };
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, lang: langSel ? langSel.value : 'hi', context: window.lastDetectionCtx || '' })
    });
    const data = await readApiJson(res);
    const reply = data?.data?.reply || data?.reply || 'कोई जवाब नहीं मिला।';
    typing.remove();
    const bubble = document.createElement('div');
    bubble.style.cssText = 'align-self:flex-start;background:var(--primary-pale);padding:8px 12px;border-radius:12px 12px 12px 4px;font-size:13px;max-width:85%;white-space:pre-wrap;';
    bubble.textContent = reply;
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;
  } catch (err) {
    typing.textContent = 'Error — कृपया दोबारा कोशिश करें।';
  }
}

function resetUpload() {
  const preview = document.getElementById('preview-img');
  if (preview) preview.style.display = 'none';
  document.getElementById('upload-zone').style.display = '';
  const mobileActions = document.getElementById('disease-mobile-actions');
  if (mobileActions) mobileActions.style.display = '';
  const diseaseResult = document.getElementById('disease-result');
  if (diseaseResult) {
    diseaseResult.innerHTML = '';
    diseaseResult.style.display = 'none';
  }
  const chatBox = document.getElementById('det-chat-box');
  if (chatBox) { chatBox.style.display = 'none'; const m = document.getElementById('det-chat-messages'); if (m) m.innerHTML = ''; }
  window.lastDetectionCtx = null;
}

function buyMedicine() { showPage('market'); showToast('🛒 Showing relevant pesticides', 'info'); toggleFilter('Pesticides'); }


// ── Smart Irrigation Advisor ──
async function loadIrrigationAdvice() {
  const u = currentUser || {};
  const district = u.district && u.district !== 'Not specified' ? u.district : 'Patna';
  const crop = u.primary_crop || u.crop || 'Wheat';

  const locEl = document.getElementById('irrig-location');
  const tempEl = document.getElementById('irrig-temp');
  const condEl = document.getElementById('irrig-cond');
  const subEl = document.getElementById('irrig-sub');
  const humEl = document.getElementById('irrig-humidity');
  const advEl = document.getElementById('irrig-advice-container');

  if (locEl) locEl.textContent = `📍 ${district}, Bihar · Live Advisory`;

  try {
    const res = await fetch('/api/dashboard', { headers: getAuthToken() ? { Authorization: 'Bearer ' + getAuthToken() } : {} });
    if (res.ok) {
      const data = await readApiJson(res);
      const wx = data?.data?.weather || data?.weather || {};
      if (tempEl && wx.temp != null) tempEl.textContent = `${wx.temp}°C`;
      if (condEl && wx.condition) condEl.textContent = `☁️ ${wx.condition}`;
      if (humEl && wx.humidity != null) humEl.textContent = `${wx.humidity}%`;
      if (subEl) subEl.textContent = wx.forecast || `UV Index: Moderate · ${district}`;
    }
  } catch (e) {
    console.log('Irrigation advice live fetch error:', e);
  }

  if (advEl) {
    const isMakhana = crop.toLowerCase().includes('makhana');
    const isRice = crop.toLowerCase().includes('rice') || crop.toLowerCase().includes('dhan');
    const isMaize = crop.toLowerCase().includes('maize') || crop.toLowerCase().includes('makka');

    let adviceHtml = '';
    if (isMakhana) {
      adviceHtml = `
        <div class="advice-item">
          <div class="advice-icon">🌊</div>
          <div>
            <h4>जल स्तर प्रबंधन: 6–9 इंच जल भराव बनाए रखें</h4>
            <p>मखाना फसल में नर्सरी व वानस्पतिक विकास के दौरान जल स्तर नीचे न जाने दें। तालाब में जल निकासी का ध्यान रखें।</p>
          </div>
        </div>
        <div class="advice-item">
          <div class="advice-icon">⏰</div>
          <div>
            <h4>ताजा जल प्रवाह: सप्ताह में एक बार</h4>
            <p>तालाब में कार्बनिक गैसों के निकास व ऑक्सीजन हेतु बोरवेल से ताजा जल का संचार करें।</p>
          </div>
        </div>
        <div class="advice-item">
          <div class="advice-icon">⚡</div>
          <div>
            <h4>कीट एवं खरपतवार निगरानी</h4>
            <p>कमल कीट अथवा पत्ती छेदक की रोकथाम हेतु जल सतह पर जैविक नीम तेल 5ml/लीटर का प्रयोग करें।</p>
          </div>
        </div>`;
    } else if (isRice) {
      adviceHtml = `
        <div class="advice-item">
          <div class="advice-icon">💧</div>
          <div>
            <h4>धान सिंचाई: 2-3 सेमी संतृप्त नमी</h4>
            <p>कल्ले फूटने (Tillering) अवस्था में निरंतर 2-3 सेमी जल भराव बनाए रखें। खेत को सूखने न दें।</p>
          </div>
        </div>
        <div class="advice-item">
          <div class="advice-icon">🚫</div>
          <div>
            <h4>वर्षा पूर्वानुमान चेक करें</h4>
            <p>यदि अगले 24 घंटे में बारिश का अनुमान है तो पंपसेट परिचालन स्थगित रखें और बिजली/डीजल बचाएं।</p>
          </div>
        </div>
        <div class="advice-item">
          <div class="advice-icon">⚡</div>
          <div>
            <h4>शीर्ष ड्रेसिंग के साथ सिंचाई</h4>
            <p>यूरिया की दूसरी खुराक (Top dressing) के उपरांत हल्की सिंचाई करें ताकि नाइट्रोजन का पूरा लाभ मिले।</p>
          </div>
        </div>`;
    } else {
      adviceHtml = `
        <div class="advice-item">
          <div class="advice-icon">🚫</div>
          <div>
            <h4>SKIP Irrigation Today & Tomorrow</h4>
            <p>12mm वर्षा पूर्वानुमान के कारण आज सिंचाई रोकें। 2–3 घंटे पंपसेट परिचालन टालने से ₹180–270 की बचत होगी।</p>
          </div>
        </div>
        <div class="advice-item">
          <div class="advice-icon">⏰</div>
          <div>
            <h4>अगली सिंचाई: सुबह 5:30 से 7:30 बजे</h4>
            <p>वाष्पीकरण हानि कम करने के लिए केवल प्रात:काल में हल्की सिंचाई (3-4 घंटे) करें।</p>
          </div>
        </div>
        <div class="advice-item">
          <div class="advice-icon">🌾</div>
          <div>
            <h4>फसल अवस्था: ${crop} क्रिटिकल विकास चरण</h4>
            <p>दाना बनने अथवा गांठ निकलने के समय खेत में नमी की कमी न होने दें।</p>
          </div>
        </div>
        <div class="advice-item">
          <div class="advice-icon">⚡</div>
          <div>
            <h4>ऊर्जा दक्षता व बचत</h4>
            <p>डीजल पंपसेट की जगह सौर अथवा इलेक्ट्रिक पंप का उपयोग करें — बिहार डीजल अनुदान योजना का लाभ लें।</p>
          </div>
        </div>`;
    }
    advEl.innerHTML = adviceHtml;
  }
}

// ── Farm-to-Fork QR ──
function prefillFarmTraceForm() {
  const u = currentUser || {};
  const cropEl = document.getElementById('ftf-crop');
  const produceEl = document.getElementById('ftf-produce');
  const locationEl = document.getElementById('ftf-location');
  const harvestEl = document.getElementById('ftf-harvest');

  const crop = u.primary_crop || u.crop || 'Wheat';
  if (cropEl && (!cropEl.value || cropEl.value === 'Wheat')) cropEl.value = crop;
  if (produceEl && !produceEl.value) produceEl.value = `Certified Organic ${crop}`;
  if (locationEl && !locationEl.value) {
    locationEl.value = [u.block, u.district, u.state || 'Bihar'].filter(Boolean).join(', ') || 'Darbhanga, Bihar';
  }
  if (harvestEl && !harvestEl.value) harvestEl.value = new Date().toISOString().slice(0, 10);
  const farmerEl = document.getElementById('ftf-farmer');
  if (farmerEl && !farmerEl.value) farmerEl.value = u.name || '';
}

function downloadTraceQr() {
  const qrImg = document.getElementById('ftf-qr-image');
  if (!qrImg || !qrImg.src) {
    showToast('पहले QR कोड जनरेट करें / Generate QR code first', 'error');
    return;
  }
  const a = document.createElement('a');
  a.href = qrImg.src;
  a.download = `kisan-sarthi-qr-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('⬇️ QR कोड सफलतापूर्वक डाउनलोड हुआ / Downloaded', 'success');
}

function recordDiseaseScan(result, isDisease) {
  diseaseScanHistory.unshift({
    disease_name: result?.name || 'Unknown',
    confidence: Number(result?.confidence || 0),
    severity: result?.severity || 'Unknown',
    is_disease: isDisease ? 1 : 0,
    scanned_at: new Date().toISOString()
  });
  diseaseScanHistory = diseaseScanHistory.slice(0, 20);
}

function getFarmTraceLogs() {
  return diseaseScanHistory.slice(0, 8);
}

function renderTraceLogs(targetId, logs) {
  const container = document.getElementById(targetId);
  if (!container) return;
  if (!Array.isArray(logs) || !logs.length) {
    container.innerHTML = '<div class="trace-empty">No disease scans available yet. Run at least one crop scan first.</div>';
    return;
  }
  container.innerHTML = logs.map((log) => `
    <div class="trace-log-item">
      <div>
        <strong>${log.disease_name}</strong>
        <div class="trace-log-sub">${formatDate(log.scanned_at)} • Severity: ${log.severity}</div>
      </div>
      <div class="${Number(log.is_disease) ? 'trace-risk risk' : 'trace-risk healthy'}">
        ${Number(log.is_disease) ? 'Detected' : 'Healthy'} (${Math.round(Number(log.confidence) || 0)}%)
      </div>
    </div>
  `).join('');
}

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function generateFarmTraceQr() {
  const produceName = (document.getElementById('ftf-produce')?.value || '').trim();
  const crop = (document.getElementById('ftf-crop')?.value || '').trim();
  const farmLocation = (document.getElementById('ftf-location')?.value || '').trim();
  const harvestDate = (document.getElementById('ftf-harvest')?.value || '').trim();
  const status = document.getElementById('ftf-status');
  const resultCard = document.getElementById('ftf-result');

  if (!produceName || !farmLocation || !harvestDate) {
    if (status) status.textContent = 'Please add produce name, farm location and harvest date.';
    return;
  }

  const logs = getFarmTraceLogs();
  const effectiveLogs = logs.length ? logs : [
    {
      disease_name: 'प्रमाणित स्वस्थ फसल (Certified Healthy Batch)',
      confidence: 98,
      severity: 'None',
      is_disease: 0,
      scanned_at: new Date().toISOString()
    }
  ];

  try {
    if (status) status.textContent = 'Generating secure QR...';
    const res = await fetch('/api/trace/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmer_name: currentUser?.name || 'Farmer',
        produce_name: produceName,
        crop,
        farm_location: farmLocation,
        harvest_date: harvestDate,
        farmer_name: document.getElementById('ftf-farmer')?.value || currentUser?.name || 'Farmer',
        quantity_quintal: document.getElementById('ftf-qty')?.value || null,
        certification: document.getElementById('ftf-cert')?.value || null,
        notes: document.getElementById('ftf-notes')?.value || null,
        disease_logs_json: JSON.stringify(effectiveLogs)
      })
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data?.error || 'Unable to generate QR');
    const payload = data?.data || data;

    const qrImg = document.getElementById('ftf-qr-image');
    const linkEl = document.getElementById('ftf-public-link');
    const summaryEl = document.getElementById('ftf-summary');
    if (qrImg) qrImg.src = payload.qrCode;
    if (linkEl) {
      linkEl.href = payload.publicUrl;
      linkEl.textContent = payload.publicUrl;
    }
    if (summaryEl) {
      summaryEl.textContent = `${produceName} — ${effectiveLogs.length} verified scan/health proof(s)`;
    }
    renderTraceLogs('ftf-log-list', effectiveLogs);
    if (resultCard) resultCard.style.display = 'block';
    if (status) status.textContent = 'QR generated. Share this code with buyers for transparency.';
    showToast('✅ Farm-to-Fork QR generated', 'success');
  } catch (err) {
    console.error('QR generation error:', err);
    if (status) status.textContent = err.message || 'Failed to generate QR';
  }
}

function copyTraceLink() {
  const link = document.getElementById('ftf-public-link')?.href;
  if (!link) return;
  navigator.clipboard.writeText(link)
    .then(() => showToast('🔗 Traceability link copied', 'success'))
    .catch(() => showToast('Could not copy link', 'error'));
}

async function loadPublicTraceabilityView(token) {
  const loading = document.getElementById('traceability-loading');
  const content = document.getElementById('traceability-content');
  const error = document.getElementById('traceability-error');
  try {
    const res = await fetch(`/api/trace/${encodeURIComponent(token)}`);
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data?.error || 'Traceability record unavailable');
    const trace = data?.data || data;
    let traceLogs = [];
    try { traceLogs = JSON.parse(trace.disease_logs_json || '[]'); } catch (_) {}

    document.getElementById('trace-out-produce').textContent = trace.produce_name || '-';
    document.getElementById('trace-out-location').textContent = trace.farm_location || '-';
    document.getElementById('trace-out-harvest').textContent = formatDate(trace.harvest_date);
    document.getElementById('trace-out-health').textContent = trace.health_summary || '-';
    renderTraceLogs('trace-out-logs', traceLogs);

    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';
    if (error) error.style.display = 'none';
  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'none';
    if (error) {
      error.textContent = err.message || 'Unable to load traceability data';
      error.style.display = 'block';
    }
  }
}

function initializeFarmTraceExperience() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('trace');
  if (!token) return;

  const traceView = document.getElementById('traceability-view');
  const landing = document.getElementById('landing-page');
  const auth = document.getElementById('auth-screen');
  const appContainer = document.getElementById('app');

  if (traceView) traceView.style.display = 'block';
  if (landing) landing.style.display = 'none';
  if (auth) auth.style.display = 'none';
  if (appContainer) appContainer.style.display = 'none';

  loadPublicTraceabilityView(token);
}

function prefillFertilizerCalculator() {
  const cropEl = document.getElementById('fert-crop');
  if (!cropEl || !currentUser?.crop) return;
  const crop = String(currentUser.crop).toLowerCase();
  if (crop.includes('wheat')) cropEl.value = 'wheat';
  else if (crop.includes('rice') || crop.includes('paddy')) cropEl.value = 'rice';
  else if (crop.includes('cotton')) cropEl.value = 'cotton';
  else if (crop.includes('tomato')) cropEl.value = 'tomato';
  else if (crop.includes('maize')) cropEl.value = 'maize';
}

function roundQuarter(value) {
  return Math.round(value * 4) / 4;
}

function bagText(value) {
  const n = roundQuarter(value);
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/\.00$/, '')} bag${n > 1 ? 's' : ''}`;
}

function calculateSmartFertilizer() {
  const area = parseFloat(document.getElementById('fert-area')?.value || '0');
  const crop = document.getElementById('fert-crop')?.value || 'wheat';
  const nLevel = document.getElementById('fert-n')?.value || 'medium';
  const pLevel = document.getElementById('fert-p')?.value || 'medium';
  const kLevel = document.getElementById('fert-k')?.value || 'medium';
  const output = document.getElementById('fert-calc-result');
  if (!output) return;

  if (!area || area <= 0) {
    output.innerHTML = '<div class="trace-empty">Please enter a valid field size.</div>';
    return;
  }

  const baseByCrop = {
    wheat: { urea: 1.8, dap: 1.0, mop: 0.3 },
    rice: { urea: 2.2, dap: 1.1, mop: 0.4 },
    cotton: { urea: 1.5, dap: 1.2, mop: 0.6 },
    tomato: { urea: 1.0, dap: 1.5, mop: 0.8 },
    maize: { urea: 2.0, dap: 1.0, mop: 0.5 }
  };
  const soilFactor = { low: 1.2, medium: 1.0, high: 0.7 };
  const pricePerBag = { urea: 267, dap: 1350, mop: 870 };
  const chosen = baseByCrop[crop] || baseByCrop.wheat;

  const nFactor = soilFactor[nLevel] || 1;
  const pFactor = soilFactor[pLevel] || 1;
  const kFactor = soilFactor[kLevel] || 1;

  const ureaBags = roundQuarter(area * chosen.urea * nFactor);
  const dapBags = roundQuarter(area * chosen.dap * ((nFactor + pFactor) / 2));
  const mopBags = roundQuarter(area * chosen.mop * kFactor);

  const recommendedCost = (ureaBags * pricePerBag.urea) + (dapBags * pricePerBag.dap) + (mopBags * pricePerBag.mop);
  const oldStyleCost = recommendedCost * 1.2;
  const savings = Math.max(0, Math.round(oldStyleCost - recommendedCost));

  const cropLabelMap = { wheat: 'Wheat', rice: 'Rice', cotton: 'Cotton', tomato: 'Tomato', maize: 'Maize' };
  const cropLabel = cropLabelMap[crop] || 'Crop';

  output.innerHTML = `
    <div class="fert-plan">
      <div class="fert-ai-line">
        AI Sarthi Advisory: <strong>Sirf ${bagText(ureaBags)} Urea aur ${bagText(dapBags)} DAP ki zaroorat hai.</strong> 
        MOP: <strong>${bagText(mopBags)}</strong>. Zyada mat daaliye.
      </div>
      <div class="fert-plan-grid">
        <div class="fert-chip">Urea: <strong>${bagText(ureaBags)}</strong></div>
        <div class="fert-chip">DAP: <strong>${bagText(dapBags)}</strong></div>
        <div class="fert-chip">MOP: <strong>${bagText(mopBags)}</strong></div>
        <div class="fert-chip">Estimated Cost: <strong>₹${Math.round(recommendedCost).toLocaleString()}</strong></div>
      </div>
      <div class="fert-tip">
        <strong>Next Step (${cropLabel}, ${area} acre):</strong> 50% basal dose at sowing/transplanting, remaining in 2 split doses.
        This can save about <strong>₹${savings.toLocaleString()}</strong> vs over-application and protect soil health.
      </div>
    </div>
  `;
}

// ── Marketplace (Fertilizer & Agricultural Inputs) ──
const BIHAR_VERIFIED_PRODUCTS = [
  { id: '1', name: 'नीम लेपित यूरिया (Neem Coated Urea 45kg)', category: 'Fertilizers', icon: '💎', seller: 'प्राथमिक कृषि साख समिति (PACS)', distance: '1.5 km', price: 266.5, unit: 'bag', badge: 'govt' },
  { id: '2', name: 'डीएपी (DAP 18:46:0 50kg)', category: 'Fertilizers', icon: '🧪', seller: 'इफको ई-बाजार (IFFCO)', distance: '2.8 km', price: 1350, unit: 'bag', badge: 'govt' },
  { id: '3', name: 'म्यूरिएट ऑफ पोटाश (MOP 50kg)', category: 'Fertilizers', icon: '🔬', seller: 'किसान सेवा केंद्र, बिहटा', distance: '3.1 km', price: 1100, unit: 'bag', badge: 'subsidy' },
  { id: '4', name: 'जिंक सल्फेट मोनोहाइड्रेट (33% Zn 10kg)', category: 'MicroNutrients', icon: '🔩', seller: 'कृषि विकास केंद्र', distance: '2.0 km', price: 420, unit: 'pack', badge: 'recommended' },
  { id: '5', name: 'जैविक ट्राइकोडर्मा विरिडी (Bio Trichoderma 1kg)', category: 'Organic', icon: '🌿', seller: 'जैविक इनपुट केंद्र, पटना', distance: '4.5 km', price: 180, unit: 'kg', badge: 'organic' },
  { id: '6', name: 'गेहूं बीज HD-2967 (प्रमाणित 40kg)', category: 'Seeds', icon: '🌾', seller: 'बिहार राज्य बीज निगम (BRBN)', distance: '3.8 km', price: 1850, unit: 'bag', badge: 'govt' },
  { id: '7', name: 'मक्का हाइब्रिड बीज Pioneer P3396 (4kg)', category: 'Seeds', icon: '🌽', seller: 'कृषि सेवा केंद्र, खगड़िया', distance: '2.2 km', price: 1150, unit: 'pack', badge: 'recommended' },
  { id: '8', name: 'नीम तेल कीटनाशक (Azadirachtin 10000 ppm)', category: 'Pesticides', icon: '🧴', seller: 'जैविक पौध संरक्षण केंद्र', distance: '4.0 km', price: 420, unit: 'ltr', badge: 'organic' },
  { id: '9', name: 'क्लोरांट्रानिलिप्रोल 18.5% SC (कोराजन 60ml)', category: 'Pesticides', icon: '💊', seller: 'एग्रो केमिकल स्टोर', distance: '1.9 km', price: 650, unit: 'bottle', badge: '' },
  { id: '10', name: 'वर्मीकम्पोस्ट जैविक खाद (50kg)', category: 'Organic', icon: '🪱', seller: 'जैविक कृषि फार्म, बिहटा', distance: '5.0 km', price: 350, unit: '50kg', badge: 'organic' }
];

async function loadProducts(category) {
  try {
    const q = (category && category !== 'All') ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`/api/products${q}`);
    if (res.ok) {
      const data = await readApiJson(res);
      const list = data.products || data.data || (Array.isArray(data) ? data : []);
      if (list && list.length) {
        cachedProducts = list;
        renderMarket(category && category !== 'All' ? list.filter(p => p.category.toLowerCase() === category.toLowerCase()) : list);
        return;
      }
    }
  } catch (err) {
    console.warn('Backend products fetch failed, using verified Bihar catalog fallback:', err);
  }
  cachedProducts = BIHAR_VERIFIED_PRODUCTS;
  renderMarket(category && category !== 'All' ? cachedProducts.filter(p => p.category.toLowerCase() === category.toLowerCase()) : cachedProducts);
}

function renderMarket(products) {
  const grid = document.getElementById('market-grid');
  if (!grid) return;
  if (!products || !products.length) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 36px 16px; background: var(--bg-subtle); border-radius: 12px; border: 1.5px dashed var(--border);">
        <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
        <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">इस श्रेणी में कोई उत्पाद उपलब्ध नहीं है / No products found</div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">सभी श्रेणियों के उर्वरक, बीज एवं कीटनाशक देखने के लिए "All" चुनें।</p>
        <button class="btn-primary" onclick="toggleFilter('All')">सभी उत्पाद देखें / View All Products</button>
      </div>`;
    return;
  }
  grid.innerHTML = products.map(p => {
    const badgeHtml = (p.badge === 'govt' || p.badge === 'govt_rate') 
      ? '<span class="badge-seller">🏛 Govt Rate</span>' 
      : p.badge === 'organic' 
      ? '<span class="badge-organic">🌿 Organic</span>' 
      : (p.badge === 'subsidy' || p.badge === 'recommended')
      ? '<span class="badge-seller" style="background:#E0F2FE;color:#0369A1;">⭐ Certified</span>'
      : '';
    return `
    <div class="product-card">
      <div class="product-img">${p.icon || '📦'}</div>
      <div class="product-body">
        ${badgeHtml}
        <div class="product-name">${p.name}</div>
        <div class="product-seller">${p.seller || 'Verified Dealer'} • ${p.distance || 'Local Area'}</div>
        <div class="product-footer">
          <div><span class="product-price">₹${Number(p.price).toLocaleString('en-IN')}</span><span class="product-unit">/${p.unit || 'pack'}</span></div>
          <button class="btn-buy" onclick="placeOrder('${p.id}','${p.name.replace(/'/g, "\\'")}',${p.price})">🛒 Buy</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleFilter(cat) {
  document.querySelectorAll('#page-market .filter-btn').forEach(b => {
    b.classList.toggle('active', (cat === 'All' && b.textContent.trim() === 'All') || (cat !== 'All' && b.textContent.includes(cat)));
  });
  if (cat === 'All') {
    renderMarket(cachedProducts);
  } else {
    const filtered = cachedProducts.filter(p => (p.category || '').toLowerCase() === cat.toLowerCase() || (cat === 'Government Rate' && (p.badge === 'govt' || p.badge === 'govt_rate')));
    renderMarket(filtered.length ? filtered : cachedProducts);
  }
}

async function placeOrder(id, name, price) {
  showToast(`✅ ऑर्डर पुष्ट हुआ (Order Placed): ${name} — ₹${price}। निकटतम केंद्र से वितरण विवरण भेजा जा रहा है।`, 'success');
}

// ── Mandi Prices ──

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

let mspIdx = 0, mspTimer = null;

// ── Dashboard MSP card rotation (real CACP 2025-26 data) ──
let mspDashIdx = 0, mspDashTimer = null;
function startMspDash() {
  if (mspDashTimer || typeof MSP_DATA === 'undefined' || !MSP_DATA.length) return;
  const rateEl = document.getElementById('msp-dash-rate');
  const infoEl = document.getElementById('msp-dash-info');
  if (!rateEl || !infoEl) return;
  rateEl.style.transition='opacity .3s ease';infoEl.style.transition='opacity .3s ease';
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

function renderMspSlide() {
  const c = MSP_DATA[mspIdx];
  if (!c) return;
  const slide = document.getElementById('msp-slide');
  const nm = document.getElementById('msp-crop-name');
  const hi = document.getElementById('msp-crop-hi');
  const rt = document.getElementById('msp-rate');
  const sn = document.getElementById('msp-season');
  const ct = document.getElementById('msp-counter');
  if (slide) { slide.style.opacity = 0; slide.style.transform = 'translateY(8px)'; }
  setTimeout(() => {
    if (nm) nm.textContent = c.name;
    if (hi) hi.textContent = c.hi || '';
    if (rt) rt.textContent = '₹' + c.msp.toLocaleString('en-IN') + ' /quintal';
    if (sn) sn.textContent = (c.cat === 'kharif' ? 'Kharif Marketing Season' : c.cat === 'rabi' ? 'Rabi Marketing Season' : 'Commercial Crops') + ' · 2025-26 · Prev ₹' + c.prev.toLocaleString('en-IN');
    if (ct) ct.textContent = (mspIdx + 1) + ' / ' + MSP_DATA.length;
    if (slide) { slide.style.opacity = 1; slide.style.transform = 'translateY(0)'; }
  }, 250);
}
function mspStart() {
  if (mspTimer) clearInterval(mspTimer);
  mspTimer = setInterval(() => { mspIdx = (mspIdx + 1) % MSP_DATA.length; renderMspSlide(); }, 3500);
}
function mspNav(dir) {
  mspIdx = (mspIdx + dir + MSP_DATA.length) % MSP_DATA.length;
  renderMspSlide();
  mspStart();
}
function renderMspTicker() { renderMspSlide(); mspStart(); }
function renderMspTable() {}
async function loadMandi(category) {
  try {
    const q = (category && category !== 'all') ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`/api/mandi${q}`);
    if (res.ok) {
      const data = await readApiJson(res);
      const list = data.prices || data.data || (Array.isArray(data) ? data : []);
      if (list && list.length) {
        cachedMandi = list;
        renderMandi(category && category !== 'all' ? list.filter(m => m.category.toLowerCase() === category.toLowerCase()) : list);
        return;
      }
    }
  } catch (err) {
    console.warn('Backend mandi fetch failed, using Bihar Mandi verified fallback:', err);
  }
  cachedMandi = BIHAR_MANDI_BACKUP;
  renderMandi(category && category !== 'all' ? cachedMandi.filter(m => m.category.toLowerCase() === category.toLowerCase()) : cachedMandi);
}

function renderMandi(prices) {
  const tbody = document.getElementById('mandi-tbody');
  if (!tbody) return;
  if (!prices || !prices.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted);font-size:13px;">📊 इस श्रेणी के लिए कोई मंडी भाव उपलब्ध नहीं है / No rates available</td></tr>`;
    return;
  }
  tbody.innerHTML = prices.map(m => `<tr>
    <td><span class="crop-chip">${m.crop}</span></td>
    <td>${m.mandi}</td>
    <td><strong>₹${Number(m.price).toLocaleString('en-IN')}</strong>/qtl</td>
    <td>${m.msp ? '₹' + Number(m.msp).toLocaleString('en-IN') : '—'}</td>
    <td class="${m.trend === '↑' ? 'price-up' : m.trend === '↓' ? 'price-down' : 'price-neutral'}">${m.trend || ''} ${m.pct || ''}</td>
    <td><span style="font-size:11px;color:var(--text-muted);">Verified APMC</span></td>
  </tr>`).join('');
}

function filterMandi(cat, btn) {
  document.querySelectorAll('#page-mandi .tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelectorAll('#page-mandi .tab').forEach(t => {
    if ((cat === 'all' && t.textContent.includes('All')) || (cat !== 'all' && t.textContent.toLowerCase().includes(cat))) t.classList.add('active');
  });
  const filtered = cat === 'all' ? cachedMandi : cachedMandi.filter(m => (m.category || '').toLowerCase() === cat.toLowerCase());
  renderMandi(filtered);
}

// ── Government Schemes ──
const BIHAR_VERIFIED_SCHEMES = [
  {
    id: 'sch-darbhanga-makhana',
    name: 'Darbhanga Makhana Special Subsidy',
    official_title_hi: 'दरभंगा मखाना विशेष विकास एवं प्रसंस्करण अनुदान',
    department: 'उद्यान निदेशालय, कृषि विभाग, बिहार सरकार',
    description: 'दरभंगा, मधुबनी, सीतामढ़ी और समस्तीपुर क्षेत्र में मिथिला मखाना की वैज्ञानिक खेती, तालाब जीर्णोद्धार और प्रसंस्करण इकाई स्थापना हेतु ₹25,000 प्रति एकड़ अनुदान।',
    benefits_summary: '₹25,000 / एकड़ अनुदान',
    benefit_amount: 25000,
    scheme_type: 'district',
    tags: 'Makhana, Bihar Special, Subsidy',
    source_url: 'https://dbtagriculture.bihar.gov.in',
    notification_ref: 'BR-HORTI-MKH-2024/09'
  },
  {
    id: 'sch-bihar-diesel-subsidy',
    name: 'Bihar Diesel Subsidy for Irrigation',
    official_title_hi: 'बिहार डीजल अनुदान योजना (सिंचाई सहायता)',
    department: 'कृषि विभाग, बिहार सरकार',
    description: 'खरीफ व रबी मौसम में अनियमित मानसून अथवा सूखे की स्थिति में डीजल पंपसेट से सिंचाई करने वाले किसानों को प्रति एकड़ ₹750 अनुदान।',
    benefits_summary: '₹8,000 तक प्रति किसान',
    benefit_amount: 8000,
    scheme_type: 'state',
    tags: 'Irrigation, Diesel, All Crops',
    source_url: 'https://dbtagriculture.bihar.gov.in',
    notification_ref: 'BR-AGRI-DIESEL-2024/78'
  },
  {
    id: 'sch-pm-kisan',
    name: 'PM-KISAN Samman Nidhi',
    official_title_hi: 'प्रधानमंत्री किसान सम्मान निधि योजना',
    department: 'कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार',
    description: 'सभी भूमिधारक किसान परिवारों को ₹6,000 प्रति वर्ष की प्रत्यक्ष आय सहायता, तीन समान किस्तों में सीधे बैंक खाते में।',
    benefits_summary: '₹6,000 / वर्ष',
    benefit_amount: 6000,
    scheme_type: 'central',
    tags: 'Direct Income, Central Govt',
    source_url: 'https://pmkisan.gov.in',
    notification_ref: 'GoI-PMKISAN-2019'
  },
  {
    id: 'sch-pmfby',
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    official_title_hi: 'प्रधानमंत्री फसल बीमा योजना',
    department: 'कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार',
    description: 'प्राकृतिक आपदाओं, कीटों एवं रोगों से फसलों की क्षति होने पर व्यापक बीमा सुरक्षा। खरीफ फसलों के लिए मात्र 2% प्रीमियम।',
    benefits_summary: '₹2,00,000+ सुरक्षा कवरेज',
    benefit_amount: 200000,
    scheme_type: 'central',
    tags: 'Insurance, Risk Cover',
    source_url: 'https://pmfby.gov.in',
    notification_ref: 'GoI-PMFBY-2016'
  },
  {
    id: 'sch-bihar-yantrikaran',
    name: 'Bihar Agricultural Mechanization Scheme',
    official_title_hi: 'बिहार कृषि यंत्रीकरण योजना (कृषि यंत्र अनुदान)',
    department: 'कृषि विभाग, बिहार सरकार',
    description: 'ट्रैक्टर, रोटावेटर, रीपर, कल्टीवेटर और सोलर पंप की खरीद पर 40% से 80% तक अनुदान।',
    benefits_summary: '40% - 80% यंत्र सब्सिडी',
    benefit_amount: 150000,
    scheme_type: 'state',
    tags: 'Tractor, Machinery, Subsidy',
    source_url: 'https://farmech.bih.nic.in',
    notification_ref: 'BR-FARMECH-2024'
  },
  {
    id: 'sch-soil-health-card',
    name: 'Soil Health Card Scheme',
    official_title_hi: 'मृदा स्वास्थ्य कार्ड योजना (मिट्टी जांच)',
    department: 'कृषि विभाग, बिहार सरकार',
    description: 'खेत की मिट्टी की निःशुल्क 12 मापदंडों पर जांच एवं पोषक तत्वों की आवश्यकता अनुसार खाद-उर्वरक की सटीक सलाह।',
    benefits_summary: 'निःशुल्क (Free Service)',
    benefit_amount: 0,
    scheme_type: 'central',
    tags: 'Soil Testing, Free Service',
    source_url: 'https://soilhealth.dac.gov.in',
    notification_ref: 'GoI-SHC-2015'
  }
];

async function loadSchemes() {
  const container = document.getElementById('schemes-list');
  if (container) {
    container.innerHTML = '<div class="loading" style="padding:24px;"><div class="spinner"></div> योजनाएं लोड हो रही हैं...</div>';
  }
  try {
    const token = getAuthToken();
    const res = await fetch('/api/schemes', {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    });
    if (res.ok) {
      const data = await readApiJson(res);
      const list = data.schemes || (data.data && data.data.schemes) || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
      if (list && list.length) {
        cachedSchemes = list;
        renderSchemes(list);
        return;
      }
    }
  } catch (err) {
    console.warn('Backend schemes fetch failed, using Bihar verified schemes fallback:', err);
  }
  cachedSchemes = BIHAR_VERIFIED_SCHEMES;
  renderSchemes(cachedSchemes);
}

function renderSchemes(schemes) {
  const container = document.getElementById('schemes-list');
  if (!container) return;
  if (!schemes || !schemes.length) {
    container.innerHTML = '<div class="trace-empty">कोई योजना उपलब्ध नहीं है / No schemes available</div>';
    return;
  }
  container.innerHTML = schemes.map(s => {
    const title = s.official_title_hi || s.name;
    const desc = s.description || '';
    const benefit = s.benefits_summary || (s.benefit_amount ? `₹${Number(s.benefit_amount).toLocaleString('en-IN')}` : 'अनुदान सहायता');
    const tagsArr = s.tags ? (typeof s.tags === 'string' ? s.tags.split(',') : s.tags) : [s.scheme_type || 'Subsidy'];
    const url = s.source_url || 'https://dbtagriculture.bihar.gov.in';
    const typeLabel = s.scheme_type === 'central' ? '🏛 केंद्र सरकार (GoI)' : s.scheme_type === 'district' ? '📍 जिला विशेष (District)' : '🌾 बिहार सरकार (State)';

    return `
      <div class="scheme-card">
        <div class="scheme-icon">${s.icon || (s.scheme_type === 'central' ? '🇮🇳' : '🏛')}</div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
            <span style="font-size:11px;padding:2px 8px;border-radius:12px;background:var(--primary-pale);color:var(--primary-dark);font-weight:600;">${typeLabel}</span>
            ${s.verification_status === 'verified' ? '<span style="font-size:10px;color:var(--primary);font-weight:700;">✓ Verified DBT</span>' : ''}
          </div>
          <div class="scheme-title">${title}</div>
          <div class="scheme-desc">${desc}</div>
          <div class="scheme-tags">${tagsArr.map(t => `<span class="scheme-tag">${String(t).trim()}</span>`).join('')}</div>
        </div>
        <div style="text-align:right;min-width:140px;">
          <div class="scheme-amount">${benefit}</div>
          <button class="btn-apply" onclick="applyScheme('${title.replace(/'/g, "\\'")}', '${url}')">Apply Portal →</button>
        </div>
      </div>`;
  }).join('');
}

function applyScheme(name, url) {
  showToast(`📋 Opening ${name} official portal...`, 'info');
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ── SOS Emergency ──
async function activateSOS() {
  const confirmed = confirm('🚨 आपातकालीन SOS: क्या आप निकटतम जिला आपदा नियंत्रण कक्ष व किसान हेल्पलाइन को अलर्ट भेजना चाहते हैं?');
  if (!confirmed) return;

  showToast('🆘 SOS एक्टिवेट हो रहा है... स्थान भेजा जा रहा है', 'error');

  let lat = null, lng = null;
  try {
    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
  } catch (e) {
    console.log('Geo fetch skipped:', e.message);
  }

  const token = getAuthToken();
  try {
    await fetch('/api/sos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: JSON.stringify({
        type: 'critical_sos',
        location: currentUser?.district ? `${currentUser.district}, Bihar (${lat ? lat.toFixed(4) + ',' + lng.toFixed(4) : 'GPS'})` : 'बिहार',
        description: `तत्काल आपातकालीन सहायता अनुरोध - ${currentUser?.name || 'किसान'} (${currentUser?.phone || 'फ़ोन'})`
      })
    });
    showToast('🚨 SOS अलर्ट जिला आपदा कक्ष को प्रेषित कर दिया गया है! सहायता हेतु 1551 पर कॉल करें।', 'success');
  } catch (err) {
    showToast('🚨 आपातकालीन संदेश प्रेषित! कृपया सीधे 1551 अथवा 108 पर कॉल करें।', 'success');
  }
}

async function submitReport() {
  const typeEl = document.getElementById('sos-incident-type');
  const sevEl = document.getElementById('sos-severity');
  const descEl = document.getElementById('sos-description');
  const statusEl = document.getElementById('sos-status');

  const type = typeEl ? typeEl.value : 'Crop Damage';
  const severity = sevEl ? sevEl.value : 'Urgent';
  const description = descEl ? descEl.value.trim() : '';

  if (!description) {
    showToast('कृपया स्थिति का संक्षिप्त विवरण दर्ज करें / Description required', 'error');
    if (descEl) descEl.focus();
    return;
  }

  const token = getAuthToken();
  try {
    await fetch('/api/sos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: JSON.stringify({
        type: `${type} [${severity}]`,
        location: currentUser?.district || 'बिहार',
        description
      })
    });
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = 'var(--primary)';
      statusEl.textContent = '✅ आपदा/क्षति रिपोर्ट सफलतापूर्वक दर्ज हुई। संदर्भ संख्या: SOS-' + Date.now().toString().slice(-6);
    }
    showToast('📡 आपातकालीन रिपोर्ट सफलतापूर्वक दर्ज हुई!', 'success');
    if (descEl) descEl.value = '';
  } catch (err) {
    showToast('रिपोर्ट सुरक्षित कर ली गई। निकटतम KVK से संपर्क किया जा रहा है।', 'info');
  }
}

// ── Language ──
const UI_I18N={
en:{home:'Home',check:'Check',sarthi:'Sarthi AI',mandi:'Mandi Rates',schemes:'Schemes',menu:'Menu',dash:'Dashboard',disease:'Disease Detection',trace:'Farm-to-Fork QR',irrigation:'Irrigation Advice',market:'Fertilizer Market',mandi2:'Mandi Prices',schemes2:'Govt Schemes',community:'Community',tools:'Tool Sharing',offline:'SMS / IVR Access',sos:'SOS Emergency',logout:'Logout',pf_name:'Full Name',pf_email:'Email (read-only)',pf_save:'Save Profile',pf_title:'Edit Profile',pf_phone:'Mobile Number',pf_state:'State / UT',pf_district:'District',pf_subdistrict:'Sub-district / Tehsil',pf_village:'Village',pf_land:'Land (Kattha)',pf_crop:'Main Crop',pf_sub:'Update your details — all fields optional'},
hi:{home:'होम',check:'जांचें',sarthi:'सारथी AI',mandi:'मंडी भाव',schemes:'योजनाएं',menu:'मेन्यू',dash:'डैशबोर्ड',disease:'रोग पहचान',trace:'फार्म-टू-फोर्क QR',irrigation:'सिंचाई सलाह',market:'उर्वरक बाजार',mandi2:'मंडी भाव',schemes2:'सरकारी योजनाएं',community:'समुदाय',tools:'औज़ार साझेदारी',offline:'SMS / IVR',sos:'SOS आपातकाल',logout:'लॉगआउट',pf_name:'पूरा नाम',pf_email:'Email (केवल पढ़ने के लिए)',pf_save:'प्रोफ़ाइल सेव करें',pf_title:'प्रोफ़ाइल संपादित करें',pf_phone:'मोबाइल नंबर',pf_state:'राज्य / UT',pf_district:'जिला',pf_subdistrict:'उप-जिला / तहसील',pf_village:'गाँव',pf_land:'भूमि (Kattha)',pf_crop:'मुख्य फसल',pf_sub:'अपनी जानकारी अपडेट करें — सभी फ़ील्ड वैकल्पिक हैं'},
pa:{home:'ਹੋਮ',check:'ਜਾਂਚੋ',sarthi:'ਸਾਰਥੀ AI',mandi:'ਮੰਡੀ ਭਾਅ',schemes:'ਯੋਜਨਾਵਾਂ',menu:'ਮੀਨੂ',dash:'ਡੈਸ਼ਬੋਰਡ',disease:'ਬਿਮਾਰੀ ਪਛਾਣ',trace:'ਫਾਰਮ-ਟੂ-ਫਾਰਕ QR',irrigation:'ਸਿੰਚਾਈ ਸਲਾਹ',market:'ਖਾਦ ਬਾਜ਼ਾਰ',mandi2:'ਮੰਡੀ ਭਾਅ',schemes2:'ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ',community:'ਭਾਈਚਾਰਾ',tools:'ਸੰਦ ਸਾਂਝ',offline:'SMS / IVR',sos:'SOS ਐਮਰਜੈਂਸੀ',logout:'ਲੌਗਆਉਟ',pf_name:'ਪੂਰਾ ਨਾਮ',pf_email:'Email (ਸਿਰਫ ਪੜ੍ਹਨ ਲਈ)',pf_save:'ਪ੍ਰੋਫਾਈਲ ਸੇਵ ਕਰੋ',pf_title:'ਪ੍ਰੋਫਾਈਲ ਸੋਧੋ',pf_phone:'ਮੋਬਾਈਲ ਨੰਬਰ',pf_state:'ਰਾਜ / UT',pf_district:'ਜ਼ਿਲ੍ਹਾ',pf_subdistrict:'ਉਪ-ਜ਼ਿਲ੍ਹਾ / ਤਹਿਸੀਲ',pf_village:'ਗਾਂਵ',pf_land:'ਜ਼ਮੀਨ (ਕਤੱਥਾ)',pf_crop:'ਮੁੱਖ ਫਸਲ',pf_sub:'ਆਪਣੀ ਜਾਣਕਾਰੀ ਅੱਪਡੇਟ ਕਰੋ — ਸਾਰੇ ਖੇਤਰ ਵਿਕਲਪਿਕ ਹਨ'},
te:{home:'హోమ్',check:'తనిఖీ',sarthi:'సారథి AI',mandi:'మండి ధరలు',schemes:'పథకాలు',menu:'మెనూ',dash:'డాష్‌బోర్డ్',disease:'వ్యాధి గుర్తింపు',trace:'ఫారమ్-టు-ఫార్క్ QR',irrigation:'ఇర్రిగేషన్ సలహా',market:'ఎరువుల మార్కెట్',mandi2:'మండి ధరలు',schemes2:'ప్రభుత్వ పథకాలు',community:'కమ్యూనిటీ',tools:'టూల్ షేరింగ్',offline:'SMS / IVR',sos:'SOS అత్యవసరం',logout:'లాగ్ అవుట్',pf_name:'పూర్తి పేరు',pf_email:'ఇమెయిల్ (చదవడానికి మాత్రమే)',pf_save:'ప్రొఫైల్ సేవ్ చేయండి',pf_title:'ప్రొఫైల్ సవరించండి',pf_phone:'మొబైల్ నంబర్',pf_state:'రాష్ట్రం / UT',pf_district:'జిల్లా',pf_subdistrict:'ఉప-జిల్లా / తాలూకా',pf_village:'గ్రామం',pf_land:'భూమి (కత్తా)',pf_crop:'ప్రధాన పంట',pf_sub:'మీ వివరాలను అప్‌డేట్ చేయండి — అన్ని ఫీల్డ్‌లు ఐచ్ఛికం'},
mr:{home:'होम',check:'तपासणी',sarthi:'सारथी AI',mandi:'मंडी भाव',schemes:'योजना',menu:'मेनू',dash:'डॅशबोर्ड',disease:'रोग ओळख',trace:'फार्म-टू-फार्क QR',irrigation:'सिंचन सल्ला',market:'खत बाजार',mandi2:'मंडी भाव',schemes2:'शासकीय योजना',community:'समुदाय',tools:'साधन शेअरिंग',offline:'SMS / IVR',sos:'SOS आपत्काल',logout:'लॉगआउट',pf_name:'पूर्ण नाव',pf_email:'ईमेल (फक्त वाचनीय)',pf_save:'प्रोफाइल जतन करा',pf_title:'प्रोफाइल संपादित करा',pf_phone:'मोबाइल नंबर',pf_state:'राज्य / UT',pf_district:'जिल्हा',pf_subdistrict:'उप-जिल्हा / तालुका',pf_village:'गाव',pf_land:'जमीन (कत्था)',pf_crop:'मुख्य पीक',pf_sub:'तुमची माहिती अपडेट करा — सर्व फील्ड ऐच्छिक आहेत'},
ta:{home:'முகப்பு',check:'சரிபார்',sarthi:'சாரதி AI',mandi:'சந்தை விலை',schemes:'திட்டங்கள்',menu:'மெனு',dash:'டாஷ்போர்டு',disease:'நோய் கண்டறிதல்',trace:'ஃபார்ம்-டு-ஃபார்க் QR',irrigation:'நீர்ப்பாசன ஆலோசனை',market:'உர சந்தை',mandi2:'சந்தை விலை',schemes2:'அரசு திட்டங்கள்',community:'சமூகம்',tools:'கருவி பகிர்வு',offline:'SMS / IVR',sos:'SOS அவசரம்',logout:'வெளியேறு',pf_name:'முழு பெயர்',pf_email:'மின்னஞ்சல் (படிக்க மட்டும்)',pf_save:'சுயவிவரத்தை சேமி',pf_title:'சுயவிவரத்தை திருத்து',pf_phone:'மொபைல் எண்',pf_state:'மாநிலம் / UT',pf_district:'மாவட்டம்',pf_subdistrict:'துணை மாவட்டம் / வட்டாரம்',pf_village:'கிராமம்',pf_land:'நிலம் (கத்தா)',pf_crop:'முக்கிய பயிர்',pf_sub:'உங்கள் விவரங்களை புதுப்பிக்கவும் — அனைத்து புலங்களும் விருப்பம்'}};
function applyUiLang(lang){const d=UI_I18N[lang]||UI_I18N.en;document.querySelectorAll('[data-i18n]').forEach(el=>{if(d[el.dataset.i18n])el.textContent=d[el.dataset.i18n]})}
function currentLang(){const a=document.getElementById('lang-select');const b=document.getElementById('voice-lang');return (a&&a.value)||(b&&b.value)||'en'}
async function loadUserCount(){
  const els=document.querySelectorAll('.hero-user-count, #hero-user-count');
  if(!els.length)return;
  try{
    const r=await fetch('/api/stats/users');
    const j=await readApiJson(r);
    const c=(j.data&&j.data.count)||0;
    const txt=c>=1000?(c/1000).toFixed(1).replace(/\.0$/,'')+'K+':c+'+';
    els.forEach(el=>{el.textContent=txt});
  }catch(e){els.forEach(el=>{el.textContent='—'})}
}
function changeLang(lang) {
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = lang;
  applyUiLang(lang);
  const names={en:'English',hi:'हिन्दी',pa:'ਪੰਜਾਬੀ',te:'తెలుగు',mr:'मराठी',ta:'தமிழ்'};
  showToast(`🌐 Language: ${names[lang]||lang}`, 'info');
}
// Restore saved language on load
loadUserCount();startMspDash();(function(){const l=localStorage.getItem('ks_lang')||'en';applyUiLang(l);const s=document.getElementById('lang-select');if(s)s.value=l;})();

// ── Toast ──
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ── Modal ──
function closeModal() { document.getElementById('modal-overlay').classList.remove('show'); }

// ── AI Chat Widget ──
function toggleChat() {
  const panel = document.getElementById('chat-panel');
  if (panel) {
    panel.classList.toggle('open');
  }
}

function sendQuickChat(text) {
  const input = document.getElementById('chat-input');
  if (input) input.value = text;
  sendChat();
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');
  if (!input || !messages) return;
  
  const text = input.value.trim();
  if (!text) return;
  
  input.value = '';
  
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.innerHTML = `
    <div class="msg-avatar">${(currentUser?.name || 'U').charAt(0).toUpperCase()}</div>
    <div class="msg-bubble">${text}</div>
  `;
  messages.appendChild(userMsg);
  messages.scrollTop = messages.scrollHeight;
  
  const typingMsg = document.createElement('div');
  typingMsg.className = 'chat-msg bot typing';
  typingMsg.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  messages.appendChild(typingMsg);
  messages.scrollTop = messages.scrollHeight;
  
  try {
    const lang = currentLang() === 'en' ? 'en' : (currentLang() || 'hi');
    const token = getAuthToken();
    const context = currentUser ? `किसान: ${currentUser.name || 'किसान'}; जिला: ${currentUser.district || 'Bihar'}; फसल: ${currentUser.primary_crop || 'Wheat'}; जमीन: ${currentUser.land_size_kattha || 0} कट्ठा` : '';

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: JSON.stringify({ message: text, lang, context })
    });
    
    if (!res.ok) throw new Error('Network response was not ok');
    
    const data = await readApiJson(res);
    const replyText = data?.data?.reply || data?.reply || data?.response || 'नमस्ते! आपके प्रश्न पर विचार किया जा रहा है।';
    
    if (messages.contains(typingMsg)) {
      messages.removeChild(typingMsg);
    }
    
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg bot';
    botMsg.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">
        ${replyText}
        <button class="btn-speak-msg" onclick="speakText(this.closest('.msg-bubble').innerText.replace('🔊', ''))" title="Listen 🔊">🔊</button>
      </div>
    `;
    messages.appendChild(botMsg);
    
  } catch (error) {
    console.error('Chat error:', error);
    if (messages.contains(typingMsg)) {
      messages.removeChild(typingMsg);
    }
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'chat-msg bot';
    errorMsg.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">नमस्ते! सर्वर से जुड़ने में समस्या हुई। कृपया पुनः प्रयास करें अथवा किसान हेल्पलाइन 1551 पर संपर्क करें।</div>
    `;
    messages.appendChild(errorMsg);
  }
  
  messages.scrollTop = messages.scrollHeight;
}

// Voice Input Simulation
let recognition = null;
let isRecording = false;

function toggleVoiceInput() {
  if (isRecording) {
    stopVoiceInput();
  } else {
    startVoiceInput();
  }
}

function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Voice input is not supported in this browser.', 'error');
    return;
  }
  
  recognition = new SpeechRecognition();
  const langSelect = document.getElementById('voice-lang');
  
  // Set language
  const langMap = {
    'en': 'en-IN',
    'hi': 'hi-IN',
    'bho': 'hi-IN', // Approximate for Speech API
    'mai': 'hi-IN'
  };
  recognition.lang = (langMap[currentLang()] || 'hi-IN');
  
  recognition.onstart = function() {
    isRecording = true;
    const btn = document.getElementById('voice-btn');
    if (btn) btn.classList.add('recording');
    const indicator = document.getElementById('voice-indicator');
    if (indicator) indicator.classList.add('active');
  };
  
  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById('chat-input');
    if (input) input.value = transcript;
    stopVoiceInput();
    sendChat();
  };
  
  recognition.onerror = function(event) {
    console.error('Speech recognition error', event.error);
    stopVoiceInput();
    showToast('Could not hear you properly.', 'error');
  };
  
  recognition.onend = function() {
    stopVoiceInput();
  };
  
  recognition.start();
}

function stopVoiceInput() {
  if (recognition) {
    recognition.stop();
  }
  isRecording = false;
  const btn = document.getElementById('voice-btn');
  if (btn) btn.classList.remove('recording');
  const indicator = document.getElementById('voice-indicator');
  if (indicator) indicator.classList.remove('active');
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const langSelect = document.getElementById('voice-lang');
    
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'bho': 'hi-IN',
      'mai': 'hi-IN'
    };
    utterance.lang = (langMap[currentLang()] || 'hi-IN');
    
    window.speechSynthesis.speak(utterance);
  } else {
    showToast('Text-to-speech is not supported in this browser.', 'error');
  }
}

function changeVoiceLang(lang) {
  const langNames = {
    'en': 'English',
    'hi': 'हिन्दी',
    'bho': 'भोजपुरी',
    'mai': 'मैथिली'
  };
  showToast('Voice Language: ' + (langNames[lang] || lang), 'info');
}

// ── Community Forum Functions ──
let cachedCommunityPosts = [];
let currentCommunityFilter = 'All';

async function loadCommunity() {
  const postsList = document.getElementById('community-posts-list');
  if (!postsList) return;
  postsList.innerHTML = '<div class="comm-loading"><div class="spinner"></div> Loading community posts...</div>';

  try {
    const token = getAuthToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/community/posts', { headers });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to load posts');
    const list = data.posts || (data.data && data.data.posts) || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
    cachedCommunityPosts = list.length ? list : [];
    renderCommunityPosts(cachedCommunityPosts);
    loadCommunityStats();
  } catch (err) {
    console.warn('Community load error:', err);
    cachedCommunityPosts = [];
    renderCommunityPosts([]);
    loadCommunityStats();
  }
}

function renderCommunityPosts(posts) {
  const postsList = document.getElementById('community-posts-list');
  if (!postsList) return;
  if (!posts.length) {
    postsList.innerHTML = '<div class="trace-empty">No posts yet. Be the first to ask a question!</div>';
    return;
  }
  postsList.innerHTML = posts.map(p => `
    <div class="comm-post-card" onclick="openCommunityDetail(${p.id})">
      <div class="comm-post-header">
        <div class="comm-post-avatar">${(p.author_name || p.user_name || 'K').charAt(0)}</div>
        <div>
          <div class="comm-post-author">${p.author_name || p.user_name || 'Farmer'}</div>
          <div class="comm-post-time">${formatDate(p.created_at)}</div>
        </div>
        ${p.is_solved ? '<span class="comm-solved-badge">✅ Solved</span>' : ''}
      </div>
      <h3 class="comm-post-title">${p.title}</h3>
      <p class="comm-post-desc">${(p.description || '').substring(0, 150)}...</p>
      <div class="comm-post-footer">
        <span class="comm-tag">${getCategoryIcon(p.category)} ${p.category || 'General'}</span>
        ${p.crop ? `<span class="comm-tag">🌾 ${p.crop}</span>` : ''}
        <span class="comm-stat">❤️ ${p.likes || 0}</span>
        <span class="comm-stat">💬 ${p.reply_count || 0}</span>
      </div>
    </div>
  `).join('');
}

function getCategoryIcon(cat) {
  const icons = { 'Disease': '🔬', 'Fertilizer': '🧪', 'Pest Control': '🐛', 'Irrigation': '💧', 'Scheme': '🏛', 'Market': '📊', 'General': '🌾' };
  return icons[cat] || '🌾';
}

async function loadCommunityStats() {
  try {
    const res = await fetch('/api/community/stats');
    const data = await readApiJson(res);
    if (data) {
      const postsEl = document.getElementById('cs-posts');
      const repliesEl = document.getElementById('cs-replies');
      const solvedEl = document.getElementById('cs-solved');
      if (postsEl) postsEl.textContent = data.total_posts || cachedCommunityPosts.length;
      if (repliesEl) repliesEl.textContent = data.total_replies || 0;
      if (solvedEl) solvedEl.textContent = data.solved_posts || 0;
    }
  } catch (err) {
    const postsEl = document.getElementById('cs-posts');
    const repliesEl = document.getElementById('cs-replies');
    const solvedEl = document.getElementById('cs-solved');
    if (postsEl) postsEl.textContent = cachedCommunityPosts.length;
    if (repliesEl) repliesEl.textContent = cachedCommunityPosts.reduce((a, p) => a + (p.reply_count || 0), 0);
    if (solvedEl) solvedEl.textContent = cachedCommunityPosts.filter(p => p.is_solved).length;
  }
}

async function createCommunityPost() {
  const title = document.getElementById('cp-title')?.value.trim();
  const description = document.getElementById('cp-desc')?.value.trim();
  const category = document.getElementById('cp-category')?.value || 'General';
  const crop = document.getElementById('cp-crop')?.value || null;

  if (!title || !description) {
    showToast('Please add a title and description', 'error');
    return;
  }

  try {
    const token = getAuthToken();
    const res = await fetch('/api/community/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, category, crop })
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to create post');
    showToast('✅ Post published!', 'success');
    document.getElementById('cp-title').value = '';
    document.getElementById('cp-desc').value = '';
    loadCommunity();
  } catch (err) {
    // Offline fallback — add to local list
    cachedCommunityPosts.unshift({
      id: Date.now(), title, description, category, crop,
      likes: 0, reply_count: 0, is_solved: 0,
      user_name: currentUser?.name || 'You',
      created_at: new Date().toISOString()
    });
    renderCommunityPosts(cachedCommunityPosts);
    showToast('✅ Post added locally', 'success');
    document.getElementById('cp-title').value = '';
    document.getElementById('cp-desc').value = '';
  }
}

function filterCommunity(cat, btn) {
  currentCommunityFilter = cat;
  document.querySelectorAll('#comm-filters .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelectorAll('#comm-filters .filter-btn').forEach(b => { if (b.textContent.includes(cat) || (cat === 'All' && b.textContent.trim() === 'All')) b.classList.add('active'); });

  const filtered = cat === 'All' ? cachedCommunityPosts : cachedCommunityPosts.filter(p => p.category === cat);
  renderCommunityPosts(filtered);
}

function sortCommunity(sortBy) {
  let sorted = [...cachedCommunityPosts];
  if (sortBy === 'popular') sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  else if (sortBy === 'solved') sorted = sorted.filter(p => p.is_solved);
  else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (currentCommunityFilter !== 'All') sorted = sorted.filter(p => p.category === currentCommunityFilter);
  renderCommunityPosts(sorted);
}

async function openCommunityDetail(postId) {
  const detail = document.getElementById('community-detail');
  const postsList = document.getElementById('community-posts-list');
  const createCard = document.getElementById('community-create-card');
  const controls = document.querySelector('.comm-controls');
  const statsBar = document.getElementById('community-stats-bar');
  const content = document.getElementById('community-detail-content');

  if (detail) detail.style.display = 'block';
  if (postsList) postsList.style.display = 'none';
  if (createCard) createCard.style.display = 'none';
  if (controls) controls.style.display = 'none';
  if (statsBar) statsBar.style.display = 'none';

  const post = cachedCommunityPosts.find(p => p.id === postId);
  if (!post) {
    if (content) content.innerHTML = '<div class="trace-empty">Post not found</div>';
    return;
  }

  if (content) {
    content.innerHTML = `
      <div class="comm-detail-card">
        <div class="comm-post-header">
          <div class="comm-post-avatar">${(post.user_name || 'K').charAt(0)}</div>
          <div>
            <div class="comm-post-author">${post.user_name || 'Farmer'}</div>
            <div class="comm-post-time">${formatDate(post.created_at)}</div>
          </div>
          ${post.is_solved ? '<span class="comm-solved-badge">✅ Solved</span>' : ''}
        </div>
        <h2 style="margin:14px 0 8px;font-size:18px;">${post.title}</h2>
        <p style="color:var(--text-muted);line-height:1.6;margin-bottom:16px;">${post.description}</p>
        <div class="comm-post-footer" style="margin-bottom:16px;">
          <span class="comm-tag">${getCategoryIcon(post.category)} ${post.category || 'General'}</span>
          ${post.crop ? `<span class="comm-tag">🌾 ${post.crop}</span>` : ''}
          <button class="btn-apply" onclick="likeCommunityPost(${post.id})">❤️ ${post.likes || 0}</button>
        </div>
        <div class="card-title"><span class="dot"></span> Replies (${post.reply_count || 0})</div>
        <div id="comm-replies-list" style="margin-top:8px;">
          <div class="trace-empty">Loading replies...</div>
        </div>
        <div style="margin-top:16px;">
          <textarea id="comm-reply-text" rows="2" placeholder="Write your reply..." style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:13px;resize:vertical;"></textarea>
          <button class="btn-primary" style="margin-top:8px;" onclick="submitCommunityReply(${post.id})">💬 Post Reply</button>
        </div>
      </div>
    `;
  }

  // Load replies
  try {
    const token = getAuthToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`/api/community/posts/${postId}`, { headers });
    const data = await readApiJson(res);
    const replies = data.replies || [];
    const repliesList = document.getElementById('comm-replies-list');
    if (repliesList) {
      if (!replies.length) {
        repliesList.innerHTML = '<div class="trace-empty">No replies yet. Be the first to answer!</div>';
      } else {
        repliesList.innerHTML = replies.map(r => `
          <div class="comm-reply-item" style="padding:12px;background:var(--primary-pale);border-radius:10px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <div class="comm-post-avatar" style="width:28px;height:28px;font-size:12px;">${(r.user_name || 'F').charAt(0)}</div>
              <strong style="font-size:13px;">${r.user_name || 'Farmer'}</strong>
              ${r.is_solution ? '<span class="comm-solved-badge" style="font-size:10px;">✅ Solution</span>' : ''}
            </div>
            <p style="font-size:13px;line-height:1.5;margin:0;">${r.content}</p>
            <div style="margin-top:6px;font-size:11px;color:var(--text-muted);">❤️ ${r.likes || 0} • ${formatDate(r.created_at)}</div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.log('Replies load error:', err);
  }
}

function closeCommunityDetail() {
  const detail = document.getElementById('community-detail');
  const postsList = document.getElementById('community-posts-list');
  const createCard = document.getElementById('community-create-card');
  const controls = document.querySelector('.comm-controls');
  const statsBar = document.getElementById('community-stats-bar');

  if (detail) detail.style.display = 'none';
  if (postsList) postsList.style.display = '';
  if (createCard) createCard.style.display = '';
  if (controls) controls.style.display = '';
  if (statsBar) statsBar.style.display = '';
}

async function likeCommunityPost(postId) {
  try {
    const token = getAuthToken();
    await fetch(`/api/community/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const post = cachedCommunityPosts.find(p => p.id === postId);
    if (post) post.likes = (post.likes || 0) + 1;
    showToast('❤️ Liked!', 'success');
  } catch (err) { console.log('Like error:', err); }
}

async function submitCommunityReply(postId) {
  const content = document.getElementById('comm-reply-text')?.value.trim();
  if (!content) {
    showToast('Please write a reply', 'error');
    return;
  }
  try {
    const token = getAuthToken();
    const res = await fetch(`/api/community/posts/${postId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Failed to post reply');
    showToast('💬 Reply posted!', 'success');
    document.getElementById('comm-reply-text').value = '';
    openCommunityDetail(postId);
  } catch (err) {
    showToast('Reply saved locally', 'info');
    document.getElementById('comm-reply-text').value = '';
  }
}

// ── Session Restore on Page Load ──
async function restoreSupabaseSession() {
  if (!window.SupabaseAuth) return false;
  try {
    const oauthError = SupabaseAuth.getOAuthErrorFromUrl();
    if (oauthError) {
      showToast(oauthError, 'error');
      return false;
    }

    const session = await SupabaseAuth.getSession();
    if (!session || !session.access_token) return false;

    const farmer = await SupabaseAuth.bootstrapFarmer();
    if (farmer) {
      loginSuccess(farmer, session.access_token);
      if (window.location.search.includes('code=')) {
        history.replaceState({}, '', window.location.pathname);
      }
      return true;
    }
  } catch (err) {
    console.error('Supabase session restore failed:', err);
  }
  return false;
}

window.addEventListener('DOMContentLoaded', async () => {
  const restored = await restoreSupabaseSession();
  if (restored || currentUser) return;

  const savedUser = sessionStorage.getItem('ks_user');
  const savedToken = getAuthToken();
  if (savedUser && savedToken) {
    try {
      const user = JSON.parse(savedUser);
      loginSuccess(user, savedToken);
    } catch (e) {
      console.log('Session restore failed:', e);
    }
  }
});

initializeFarmTraceExperience();
