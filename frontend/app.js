// ═══════════════════════════════════════════
//  Kisan Sarthi — कृषि सारथी
//  Firebase Edition — Phone OTP Auth + Firestore
// ═══════════════════════════════════════════

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

function toggleMobileMenu() {
  const links = document.getElementById('nav-links');
  if (links) links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
}

function openAuth(tab) {
  document.getElementById('auth-screen').classList.add('show');
  switchAuthTab(tab || 'login');
}

// ── Auth ──
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup')));
  document.getElementById('login-form').classList.toggle('hidden', tab === 'signup');
  document.getElementById('signup-form').classList.toggle('hidden', tab === 'login');
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

    loginSuccess(data.user, data.token);
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
      const { data, error } = await SupabaseAuth.signInWithEmail(email, password);
      if (error) throw new Error(error.message || 'Login failed');
      const farmer = await SupabaseAuth.bootstrapFarmer();
      loginSuccess(farmer, (data.session && data.session.access_token) || localStorage.getItem('token'));
      showToast(`✅ Welcome back, ${(farmer.name || 'Farmer').split(' ')[0]}!`, 'success');
      return;
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

async function handleEmailSignup() {
  clearAuthErrors();
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const password = document.getElementById('su-password').value;
  const phone = document.getElementById('su-phone').value.trim();
  const district = document.getElementById('su-district').value;
  const block = document.getElementById('su-block').value.trim();
  const land_size_kattha = document.getElementById('su-land').value.trim();
  const primary_crop = document.getElementById('su-crop').value;

  if (!name || !email || !password || !district || !block || !land_size_kattha) {
    if (!name) showFieldError('su-name', 'Name is required');
    if (!email) showFieldError('su-email', 'Email is required');
    if (!password) showFieldError('su-password', 'Password is required');
    if (!district) showFieldError('su-district', 'District is required');
    if (!block) showFieldError('su-block', 'Block is required');
    if (!land_size_kattha) showFieldError('su-land', 'Land size is required');
    return;
  }

  try {
    if (window.SupabaseAuth && await SupabaseAuth.isConfigured()) {
      const { data, error } = await SupabaseAuth.signUpWithEmail(email, password, {
        name,
        phone: phone || null,
        district,
        block,
        land_size_kattha: parseFloat(land_size_kattha),
        primary_crop,
      });
      if (error) throw new Error(error.message || 'Registration failed');
      if (data && data.session) {
        const farmer = await SupabaseAuth.bootstrapFarmer();
        loginSuccess(farmer, data.session.access_token);
        showToast(`✅ Welcome to Kisan Sarthi, ${(farmer.name || 'Farmer').split(' ')[0]}!`, 'success');
      } else {
        showAuthError('signup-form', 'Account created. Please check your email to confirm, then log in.');
        switchAuthTab('login');
      }
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        email, 
        password, 
        phone, 
        district, 
        block, 
        land_size_kattha: parseFloat(land_size_kattha), 
        primary_crop,
        phone: phone || null
      })
    });

    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    loginSuccess(data.user, data.token);
    showToast(`✅ Welcome to Kisan Sarthi, ${data.user.name.split(' ')[0]}!`, 'success');
  } catch (err) {
    console.error('Signup error:', err);
    showAuthError('signup-form', err.message);
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

function loginSuccess(user, token) {
  // Normalize id/uid for compatibility
  user.uid = user.id || user.uid;
  user.id = user.id || user.uid;
  
  currentUser = user;
  if (token) {
    localStorage.setItem('token', token);
  }
  sessionStorage.setItem('ks_user', JSON.stringify(user));
  const cpScreen = document.getElementById('complete-profile-screen');
  if (!isProfileComplete(user)) {
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('auth-screen').classList.remove('show');
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('forgot-password-screen').style.display = 'none';
    document.getElementById('app').classList.remove('visible');
    if (cpScreen) cpScreen.style.display = 'flex';
    initCompleteProfileForm();
    return;
  }
  if (cpScreen) cpScreen.style.display = 'none';
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('auth-screen').classList.remove('show');
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  document.getElementById('sidebar-name').textContent = user.name || 'Farmer';
  document.getElementById('sidebar-loc').textContent = `📍 ${user.district || user.state || 'Bihar'}`;
  document.getElementById('sidebar-avatar').textContent = (user.name || 'K').charAt(0).toUpperCase();
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
  prefillToolForm();
  loadDashboard(); loadProducts(); loadMandi('all'); loadSchemes();
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

async function initCompleteProfileForm() {
  const user = currentUser || {};
  const name = document.getElementById('cp-name');
  const phone = document.getElementById('cp-phone');
  const district = document.getElementById('cp-district');
  const block = document.getElementById('cp-block');
  const land = document.getElementById('cp-land');
  const crop = document.getElementById('cp-crop');
  if (name) name.value = user.name || '';
  if (phone) phone.value = user.phone || '';
  if (land) land.value = user.land_size_kattha || '';
  if (crop) crop.value = user.primary_crop || '';
  if (block) block.value = (user.block && user.block !== 'Not specified') ? user.block : '';
  if (land) land.oninput = updateBighaPreview;
  if (district) district.onchange = () => populateBlockOptions(district.value);

  try {
    const loc = await getBiharLocations();
    if (district && district.options.length <= 1) {
      loc.districts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        district.appendChild(opt);
      });
    }
    if (user.district && user.district !== 'Not specified') district.value = user.district;
    populateBlockOptions(district.value);
    updateBighaPreview();
  } catch (err) {
    console.error('Location master load failed:', err);
  }
}

async function submitCompleteProfile() {
  clearAuthErrors();
  const name = document.getElementById('cp-name').value.trim();
  const phone = document.getElementById('cp-phone').value.trim();
  const district = document.getElementById('cp-district').value;
  const block = document.getElementById('cp-block').value.trim();
  const land = document.getElementById('cp-land').value;
  const crop = document.getElementById('cp-crop').value;

  if (!name) showFieldError('cp-name', 'नाम आवश्यक है');
  if (!/^[6-9]\d{9}$/.test(phone)) showFieldError('cp-phone', 'मान्य 10-अंकीय मोबाइल नंबर दर्ज करें');
  if (!district) showFieldError('cp-district', 'जिला चुनें');
  if (!block) showFieldError('cp-block', 'प्रखंड दर्ज करें');
  if (!(Number(land) > 0)) showFieldError('cp-land', 'भूमि Kattha में दर्ज करें');
  if (!crop) showFieldError('cp-crop', 'फसल चुनें');
  if (!name || !/^[6-9]\d{9}$/.test(phone) || !district || !block || !(Number(land) > 0) || !crop) return;

  const btn = document.getElementById('cp-submit');
  btn.disabled = true;
  btn.textContent = '⏳ Saving…';
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/farmers/me/complete-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, phone, district, block, land_size_kattha: Number(land), primary_crop: crop })
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Profile completion failed');
    const farmer = (data.data && data.data.farmer) || data.farmer;
    currentUser = { ...currentUser, ...farmer };
    sessionStorage.setItem('ks_user', JSON.stringify(currentUser));
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
function showPage(pageId, elem) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  if (elem) elem.classList.add('active');
  else { document.querySelectorAll('.nav-item').forEach(n => { if (n.textContent.toLowerCase().includes(pageId)) n.classList.add('active'); }); }
  const titles = { dashboard:'Dashboard', disease:'AI Disease Detection', trace:'Farm-to-Fork QR', tools:'Tool Sharing', weather:'Smart Irrigation', market:'Fertilizer Marketplace', mandi:'Mandi Prices', schemes:'Govt Schemes', community:'Kisan Community', offline:'SMS / IVR Access', sos:'SOS Emergency' };
  document.getElementById('page-title').textContent = titles[pageId] || pageId;
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo(0, 0);
  if (pageId === 'community') loadCommunity();
  if (pageId === 'market') prefillFertilizerCalculator();
  if (pageId === 'tools') loadToolSharing();
}

// ── Dashboard ──
async function loadDashboard() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, using default data');
      return;
    }

    const res = await fetch('/api/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      console.log('Dashboard API error, using default data');
      return;
    }
    
    const data = await readApiJson(res);
    console.log('Dashboard data:', data);
    
    // Update dashboard cards with API data
    const cards = document.querySelectorAll('.stat-card');
    if (cards[0]) { // Crop Health
      cards[0].querySelector('.stat-value').textContent = data.stats.cropHealth + '%';
      cards[0].querySelector('.stat-change').textContent = data.stats.cropHealthChange;
    }
    if (cards[1]) { // Irrigation
      cards[1].querySelector('.stat-value').textContent = data.stats.irrigation;
      cards[1].querySelector('.stat-change').textContent = data.stats.irrigationReason;
    }
    if (cards[2]) { // Market Price
      cards[2].querySelector('.stat-value').textContent = data.stats.marketPrice;
      cards[2].querySelector('.stat-change').textContent = data.stats.marketTrend;
    }
    if (cards[3]) { // Schemes
      cards[3].querySelector('.stat-value').textContent = data.stats.eligibleSchemes;
      cards[3].querySelector('.stat-change').textContent = data.stats.schemesAmount;
    }
    
    // Update weather info
    const weatherInfo = document.querySelector('.weather-info');
    if (weatherInfo) {
      weatherInfo.innerHTML = `
        <div class="weather-temp">${data.weather.temp}°C</div>
        <div class="weather-desc">${data.weather.condition}</div>
        <div class="weather-location">${data.weather.location}</div>
      `;
    }
    
  } catch (err) {
    console.log('Dashboard error:', err);
  }
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
    const diseaseResult = document.getElementById('disease-result');
    if (diseaseResult) {
      diseaseResult.style.display = 'block';
      diseaseResult.innerHTML = '<div class="loading"><div class="spinner"></div> AI analyzing your crop image...</div>';
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', file);
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
      for (let i = 0; i < 20; i++) {
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
      showDiseaseResult(mapped, det.health_status === 'diseased');
    } catch (err) {
      console.error('Detection upload failed:', err);
      showDiseaseResult({ name: 'Analysis unavailable', confidence: 0, severity: 'unknown', cure: 'Please try again or visit the nearest KVK.', prevention: 'Use a clear, well-lit photo of the affected leaf.' }, false);
    }
  };
  reader.readAsDataURL(file);
}

function showDiseaseResult(result, isDisease) {
  recordDiseaseScan(result, isDisease);
  document.getElementById('disease-result').innerHTML = `
    <div class="result-card">
      <span class="result-tag ${isDisease ? 'tag-disease' : 'tag-healthy'}">${isDisease ? '⚠️ Disease Detected' : '✅ Healthy Crop'}</span>
      <h3 style="margin:8px 0;font-size:17px;">${result.name}</h3>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:12px;color:var(--text-muted);">Confidence</span><div class="confidence-bar" style="flex:1;"><div class="confidence-fill" style="width:${result.confidence}%;"></div></div><strong style="font-size:13px;">${result.confidence}%</strong></div>
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">Severity: <strong>${result.severity}</strong></p>
      <div class="ai-bubble"><div class="ai-header"><div class="ai-dot"></div><span>AI Recommendation</span></div><strong>💊 Treatment:</strong><br>${result.cure}<br><br><strong>🛡 Prevention:</strong><br>${result.prevention}</div>
      ${isDisease ? '<button class="btn-primary" style="margin-top:12px;width:100%;" onclick="buyMedicine()">🛒 Buy Recommended Medicine</button>' : ''}
    </div>`;
}

function resetUpload() {
  const preview = document.getElementById('preview-img');
  if (preview) preview.style.display = 'none';
  document.getElementById('upload-zone').style.display = '';
  const diseaseResult = document.getElementById('disease-result');
  if (diseaseResult) {
    diseaseResult.innerHTML = '';
    diseaseResult.style.display = 'none';
  }
}

function buyMedicine() { showPage('market'); showToast('🛒 Showing relevant pesticides', 'info'); toggleFilter('Pesticides'); }

// ── Farm-to-Fork QR ──
function prefillFarmTraceForm() {
  const crop = document.getElementById('ftf-crop');
  const location = document.getElementById('ftf-location');
  const harvest = document.getElementById('ftf-harvest');
  if (crop && currentUser?.crop) crop.value = currentUser.crop;
  if (location && currentUser?.state) location.value = currentUser.state;
  if (harvest && !harvest.value) harvest.value = new Date().toISOString().slice(0, 10);
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
  if (!logs.length) {
    if (status) status.textContent = 'Run at least one Disease Detection scan before generating QR.';
    return;
  }

  try {
    if (status) status.textContent = 'Generating secure QR...';
    const res = await fetch('/api/farm-trace/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmerName: currentUser?.name || 'Farmer',
        produceName,
        crop,
        farmLocation,
        harvestDate,
        diseaseLogs: logs
      })
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data?.error || 'Unable to generate QR');

    const qrImg = document.getElementById('ftf-qr-image');
    const linkEl = document.getElementById('ftf-public-link');
    const summaryEl = document.getElementById('ftf-summary');
    if (qrImg) qrImg.src = data.qrDataUrl;
    if (linkEl) {
      linkEl.href = data.publicUrl;
      linkEl.textContent = data.publicUrl;
    }
    if (summaryEl) {
      summaryEl.textContent = data?.summary?.healthSummary || 'Health summary unavailable';
    }
    renderTraceLogs('ftf-log-list', logs);
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
    const res = await fetch(`/api/farm-trace/${encodeURIComponent(token)}`);
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data?.error || 'Traceability record unavailable');
    const trace = data.trace;

    document.getElementById('trace-out-produce').textContent = trace.produceName || '-';
    document.getElementById('trace-out-location').textContent = trace.farmLocation || '-';
    document.getElementById('trace-out-harvest').textContent = formatDate(trace.harvestDate);
    document.getElementById('trace-out-health').textContent = trace.healthSummary || '-';
    renderTraceLogs('trace-out-logs', trace.diseaseLogs || []);

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

// ── Marketplace ──
// ── Tool Sharing (Uber for Tractors) ──
function normalizedPhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

function prefillToolForm() {
  const nameEl = document.getElementById('tool-owner-name');
  const phoneEl = document.getElementById('tool-owner-phone');
  const stateEl = document.getElementById('tool-state');
  if (nameEl && currentUser?.name) nameEl.value = currentUser.name;
  if (phoneEl && currentUser?.phone) phoneEl.value = normalizedPhone(currentUser.phone);
  if (stateEl && currentUser?.state) stateEl.value = currentUser.state;
}

function getCurrentUserPhone() {
  return normalizedPhone(currentUser?.phone || document.getElementById('tool-owner-phone')?.value || '');
}

async function loadToolSharing() {
  prefillToolForm();
  const state = currentUser?.state || document.getElementById('tool-state')?.value || 'Bihar';
  try {
    const [listRes, alertRes] = await Promise.all([
      fetch(`/api/tools/listings?status=available&state=${encodeURIComponent(state)}`),
      fetch(`/api/tools/alerts?state=${encodeURIComponent(state)}`)
    ]);
    const listData = await listRes.json();
    const alertData = await alertRes.json();
    cachedToolListings = listData.listings || [];
    renderToolListings(cachedToolListings);
    renderToolAlerts(alertData.alerts || []);
  } catch (err) {
    console.error('Tool sharing load error:', err);
  }
  loadToolBookings();
}

function renderToolAlerts(alerts) {
  const container = document.getElementById('tool-ai-alerts');
  if (!container) return;
  if (!alerts.length) {
    container.innerHTML = '<div class="trace-empty">No nearby machine alerts right now.</div>';
    return;
  }
  container.innerHTML = alerts.map(a => `
    <div class="tool-alert-item">
      <strong>AI Sarthi:</strong> ${a.ai_message}
      <div class="tool-alert-sub">${a.tool_name} • ${a.location}</div>
    </div>
  `).join('');
}

function renderToolListings(listings) {
  const container = document.getElementById('tool-listings');
  if (!container) return;
  if (!listings.length) {
    container.innerHTML = '<div class="trace-empty">No tools available in your area right now.</div>';
    return;
  }
  container.innerHTML = listings.map(l => `
    <div class="tool-card">
      <div class="tool-head">
        <div>
          <div class="tool-name">${l.tool_name}</div>
          <div class="tool-meta">${l.tool_type} • ${l.location}</div>
        </div>
        <span class="tool-rate">₹${Math.round(Number(l.price_per_hour) || 0)}/hr</span>
      </div>
      <div class="tool-owner">Owner: ${l.owner_name} • ${l.owner_phone}</div>
      <div class="tool-owner">Available: ${l.available_from || '--'} to ${l.available_to || '--'}</div>
      <div class="tool-notes">${l.notes || ''}</div>
      <button class="btn-primary" onclick="requestToolBooking(${l.id})">Request Booking</button>
    </div>
  `).join('');
}

async function createToolListing() {
  const payload = {
    owner_name: document.getElementById('tool-owner-name')?.value.trim(),
    owner_phone: normalizedPhone(document.getElementById('tool-owner-phone')?.value),
    tool_type: document.getElementById('tool-type')?.value,
    tool_name: document.getElementById('tool-name')?.value.trim(),
    price_per_hour: Number(document.getElementById('tool-price')?.value || 0),
    location: document.getElementById('tool-location')?.value.trim(),
    state: document.getElementById('tool-state')?.value.trim(),
    available_from: document.getElementById('tool-from')?.value,
    available_to: document.getElementById('tool-to')?.value,
    notes: document.getElementById('tool-notes')?.value.trim()
  };

  if (!payload.owner_name || !payload.owner_phone || !payload.tool_name || !payload.location || !payload.price_per_hour) {
    showToast('Please fill all required tool listing fields', 'error');
    return;
  }

  try {
    const res = await fetch('/api/tools/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to create listing');
    showToast('✅ Tool listed successfully', 'success');
    loadToolSharing();
  } catch (err) {
    showToast(err.message || 'Failed to list tool', 'error');
  }
}

async function requestToolBooking(listingId) {
  const requesterPhone = getCurrentUserPhone();
  if (!requesterPhone) {
    showToast('Please login or add your phone number in tool form first', 'error');
    return;
  }
  const hours = Number(prompt('How many hours do you want to book?', '2') || 2);
  const message = prompt('Any message for owner? (optional)', '') || '';
  const payload = {
    requester_name: currentUser?.name || 'Farmer',
    requester_phone: requesterPhone,
    requested_hours: Number.isFinite(hours) && hours > 0 ? hours : 2,
    requested_date: new Date().toISOString().slice(0, 10),
    message
  };
  try {
    const res = await fetch(`/api/tools/listings/${listingId}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Booking request failed');
    showToast('📩 Booking request sent to owner', 'success');
    loadToolBookings();
  } catch (err) {
    showToast(err.message || 'Failed to request booking', 'error');
  }
}

async function loadToolBookings() {
  const phone = getCurrentUserPhone();
  if (!phone) return;
  try {
    const res = await fetch(`/api/tools/bookings?phone=${encodeURIComponent(phone)}`);
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Could not load bookings');
    cachedToolIncoming = data.incoming || [];
    cachedToolOutgoing = data.outgoing || [];
    renderToolIncoming(cachedToolIncoming);
    renderToolOutgoing(cachedToolOutgoing);
  } catch (err) {
    console.error('loadToolBookings error:', err);
  }
}

function bookingStatusBadge(status) {
  const s = String(status || 'pending');
  return `<span class="tool-status status-${s}">${s.replace('_', ' ')}</span>`;
}

function renderToolIncoming(rows) {
  const container = document.getElementById('tool-incoming-bookings');
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '<div class="trace-empty">No incoming requests yet.</div>';
    return;
  }
  container.innerHTML = rows.map(r => `
    <div class="tool-booking-item">
      <div><strong>${r.requester_name}</strong> requested ${r.tool_name} (${r.requested_hours} hrs)</div>
      <div class="tool-booking-meta">${r.requester_phone} • ${r.requested_date || ''} • ${bookingStatusBadge(r.status)}</div>
      <div class="tool-booking-actions">
        ${r.status === 'pending' ? `
          <button class="btn-apply" onclick="respondToolBooking(${r.id}, 'accept')">Accept</button>
          <button class="btn-apply" onclick="respondToolBooking(${r.id}, 'reject')">Reject</button>
        ` : ''}
        ${(r.status === 'accepted' || r.status === 'in_progress') ? `
          <button class="btn-apply" onclick="updateToolBookingStatus(${r.id}, 'in_progress')">Start Job</button>
          <button class="btn-apply" onclick="updateToolBookingStatus(${r.id}, 'completed')">Mark Complete</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function renderToolOutgoing(rows) {
  const container = document.getElementById('tool-outgoing-bookings');
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = '<div class="trace-empty">No outgoing requests yet.</div>';
    return;
  }
  container.innerHTML = rows.map(r => `
    <div class="tool-booking-item">
      <div><strong>${r.tool_name}</strong> with ${r.owner_name} (${r.requested_hours} hrs)</div>
      <div class="tool-booking-meta">${r.owner_phone} • ${r.location} • ${bookingStatusBadge(r.status)}</div>
      <div class="tool-booking-actions">
        ${['pending','accepted','in_progress'].includes(r.status) ? `<button class="btn-apply" onclick="updateToolBookingStatus(${r.id}, 'cancelled')">Cancel</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function respondToolBooking(bookingId, action) {
  const ownerPhone = normalizedPhone(document.getElementById('tool-owner-phone')?.value || currentUser?.phone);
  if (!ownerPhone) {
    showToast('Owner phone required to respond', 'error');
    return;
  }
  try {
    const res = await fetch(`/api/tools/bookings/${bookingId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, owner_phone: ownerPhone })
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to update request');
    showToast(action === 'accept' ? '✅ Request accepted' : 'Rejected request', 'success');
    loadToolSharing();
  } catch (err) {
    showToast(err.message || 'Failed to respond request', 'error');
  }
}

async function updateToolBookingStatus(bookingId, status) {
  try {
    const res = await fetch(`/api/tools/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    showToast(`✅ ${status.replace('_', ' ')} updated`, 'success');
    loadToolSharing();
  } catch (err) {
    showToast(err.message || 'Failed to update status', 'error');
  }
}

async function loadProducts(category) {
  try {
    const conditions = category && category !== 'All' ? [['category','==',category]] : [];
    const products = FIREBASE_CONFIGURED ? await fbGetAll('products', conditions) : demoProducts;
    cachedProducts = products;
    renderMarket(products);
  } catch (err) { renderMarket(demoProducts); }
}

const demoProducts = [
  {id:'1', name:'DAP Fertilizer (50kg)', category:'Fertilizers', icon:'🧪', seller:'Agro Center Ludhiana', distance:'2.3 km', price:1350, unit:'bag', badge:'govt'},
  {id:'2', name:'Urea (45kg)', category:'Fertilizers', icon:'💎', seller:'Kisan Depot', distance:'3.1 km', price:267, unit:'bag', badge:'govt'},
  {id:'3', name:'NPK 12:32:16 (50kg)', category:'Fertilizers', icon:'🔬', seller:'Agro Chemicals Ltd', distance:'2.8 km', price:1180, unit:'bag', badge:''},
  {id:'4', name:'Propiconazole 25% EC', category:'Pesticides', icon:'💊', seller:'Pesticide House', distance:'1.8 km', price:420, unit:'ltr', badge:''},
  {id:'5', name:'Imidacloprid 17.8% SL', category:'Pesticides', icon:'🧴', seller:'Crop Guard Store', distance:'2.5 km', price:360, unit:'ltr', badge:''},
  {id:'6', name:'Wheat Seeds HD-2967', category:'Seeds', icon:'🌾', seller:'Seed Corporation', distance:'5.2 km', price:2850, unit:'40kg', badge:'govt'},
  {id:'7', name:'Paddy Seeds PR-126', category:'Seeds', icon:'🌱', seller:'Punjab Seed Corp', distance:'4.8 km', price:1680, unit:'30kg', badge:'govt'},
  {id:'8', name:'Neem Oil (Organic)', category:'Organic', icon:'🌿', seller:'Green Earth Store', distance:'4.5 km', price:380, unit:'ltr', badge:'organic'},
  {id:'9', name:'Vermicompost (50kg)', category:'Organic', icon:'🪱', seller:'Organic Farm Supply', distance:'6.1 km', price:450, unit:'50kg', badge:'organic'},
];

function renderMarket(products) {
  const grid = document.getElementById('market-grid');
  if (!grid) return;
  grid.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="product-img">${p.icon || '📦'}</div>
      <div class="product-body">
        ${p.badge === 'govt' ? '<span class="badge-seller">🏛 Govt Rate</span>' : p.badge === 'organic' ? '<span class="badge-organic">🌿 Organic</span>' : ''}
        <div class="product-name">${p.name}</div>
        <div class="product-seller">${p.seller} • ${p.distance}</div>
        <div class="product-footer">
          <div><span class="product-price">₹${Number(p.price).toLocaleString()}</span><span class="product-unit">/${p.unit}</span></div>
          <button class="btn-buy" onclick="placeOrder('${p.id}','${p.name}',${p.price})">🛒 Buy</button>
        </div>
      </div>
    </div>`).join('');
}

function toggleFilter(cat) {
  document.querySelectorAll('#page-market .filter-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(cat) || (cat === 'All' && b.textContent === 'All')));
  const filtered = cat === 'All' ? cachedProducts : cachedProducts.filter(p => p.category === cat);
  renderMarket(filtered.length ? filtered : cachedProducts);
}

async function placeOrder(id, name, price) {
  if (FIREBASE_CONFIGURED && currentUser) {
    try { await fbAdd('orders', { user_id: currentUser.uid, product_id: id, product_name: name, quantity: 1, total_price: price, status: 'confirmed' }); } catch (e) {}
  }
  showToast(`✅ Order confirmed: ${name} — ₹${price}`, 'success');
}

// ── Mandi Prices ──
async function loadMandi(category) {
  try {
    const conditions = category && category !== 'all' ? [['category','==',category]] : [];
    const prices = FIREBASE_CONFIGURED ? await fbGetAll('mandi_prices', conditions) : demoMandi;
    cachedMandi = prices;
    renderMandi(prices);
  } catch (err) { renderMandi(demoMandi); }
}

const demoMandi = [
  {crop:'🌾 Wheat',category:'grains',mandi:'Ludhiana',price:2290,msp:2275,change_val:15,pct:'+0.66%',trend:'↑'},
  {crop:'🌾 Wheat',category:'grains',mandi:'Amritsar',price:2310,msp:2275,change_val:20,pct:'+0.88%',trend:'↑'},
  {crop:'🌾 Rice',category:'grains',mandi:'Karnal',price:2185,msp:2183,change_val:8,pct:'+0.37%',trend:'↑'},
  {crop:'🫘 Chana',category:'pulses',mandi:'Indore',price:5200,msp:5440,change_val:-45,pct:'-0.86%',trend:'↓'},
  {crop:'🫘 Soybean',category:'oilseeds',mandi:'Indore',price:4350,msp:4600,change_val:45,pct:'+1.05%',trend:'↑'},
  {crop:'🧅 Onion',category:'vegetables',mandi:'Nashik',price:1250,msp:null,change_val:-89,pct:'-6.60%',trend:'↓'},
  {crop:'🍅 Tomato',category:'vegetables',mandi:'Kolar',price:2100,msp:null,change_val:120,pct:'+6.10%',trend:'↑'},
  {crop:'🌿 Cotton',category:'oilseeds',mandi:'Rajkot',price:6480,msp:6620,change_val:30,pct:'+0.46%',trend:'↑'},
];

function renderMandi(prices) {
  const tbody = document.getElementById('mandi-tbody');
  if (!tbody) return;
  tbody.innerHTML = prices.map(m => `<tr>
    <td><span class="crop-chip">${m.crop}</span></td>
    <td>${m.mandi}</td>
    <td><strong>₹${Number(m.price).toLocaleString()}</strong>/q</td>
    <td>${m.msp ? '₹'+Number(m.msp).toLocaleString() : '—'}</td>
    <td class="${m.trend === '↑' ? 'price-up' : m.trend === '↓' ? 'price-down' : 'price-neutral'}">${m.trend} ${m.pct}</td>
  </tr>`).join('');
}

function filterMandi(cat) {
  document.querySelectorAll('#page-mandi .tab').forEach(t => t.classList.toggle('active', t.textContent.toLowerCase().includes(cat)));
  const filtered = cat === 'all' ? cachedMandi : cachedMandi.filter(m => m.category === cat);
  renderMandi(filtered.length ? filtered : cachedMandi);
}

// ── Government Schemes ──
async function loadSchemes() {
  try {
    const schemes = FIREBASE_CONFIGURED ? await fbGetAll('schemes') : demoSchemes;
    cachedSchemes = schemes;
    renderSchemes(schemes);
  } catch (err) { renderSchemes(demoSchemes); }
}

const demoSchemes = [
  {id:'1',name:'PM-KISAN Samman Nidhi',description:'Direct income support of ₹6,000/year to all landholding farmer families.',icon:'🌾',amount:'₹6,000',period:'/year',tags:'Direct Benefit,All Farmers',eligible_states:'ALL',eligible_crops:'ALL'},
  {id:'2',name:'PM Fasal Bima Yojana',description:'Comprehensive crop insurance at just 2% premium for Kharif crops.',icon:'🛡',amount:'₹2L+',period:'coverage',tags:'Insurance,Subsidized',eligible_states:'ALL',eligible_crops:'ALL'},
  {id:'3',name:'Per Drop More Crop',description:'Subsidy up to 55% on micro-irrigation systems (drip and sprinkler).',icon:'💧',amount:'55%',period:'subsidy',tags:'Irrigation,Subsidy',eligible_states:'ALL',eligible_crops:'ALL'},
  {id:'4',name:'Kisan Credit Card',description:'Easy agricultural credit at 4% interest rate for crop production.',icon:'🏦',amount:'₹3L',period:'limit',tags:'Credit,Low Interest',eligible_states:'ALL',eligible_crops:'ALL'},
  {id:'5',name:'Soil Health Card Scheme',description:'Free soil testing and personalized fertilizer recommendations.',icon:'🧪',amount:'Free',period:'service',tags:'Soil Testing,Free',eligible_states:'ALL',eligible_crops:'ALL'},
];

function renderSchemes(schemes) {
  const container = document.getElementById('schemes-list');
  if (!container) return;
  const userState = currentUser?.state || 'Bihar';
  const userCrop = currentUser?.crop || 'Wheat';
  const eligible = schemes.filter(s => (s.eligible_states === 'ALL' || (s.eligible_states||'').includes(userState)) && (s.eligible_crops === 'ALL' || (s.eligible_crops||'').includes(userCrop)));
  container.innerHTML = eligible.map(s => `
    <div class="scheme-card">
      <div class="scheme-icon">${s.icon || '🏛'}</div>
      <div>
        <div class="scheme-title">${s.name}</div>
        <div class="scheme-desc">${s.description}</div>
        <div class="scheme-tags">${(s.tags||'').split(',').map(t => `<span class="scheme-tag">${t.trim()}</span>`).join('')}</div>
      </div>
      <div style="text-align:right;">
        <div class="scheme-amount">${s.amount}<span>${s.period}</span></div>
        <button class="btn-apply" onclick="applyScheme('${s.name}')">Apply →</button>
      </div>
    </div>`).join('');
}

function applyScheme(name) { showToast(`📋 Opening ${name} application portal...`, 'info'); }

// ── SOS Emergency ──
async function activateSOS() {
  showToast('🆘 SOS Activated! Sending alert to nearest authorities...', 'error');
  if (FIREBASE_CONFIGURED && currentUser) {
    try {
      let lat = null, lng = null;
      try { const pos = await new Promise((res,rej) => navigator.geolocation.getCurrentPosition(res, rej, {timeout:5000})); lat = pos.coords.latitude; lng = pos.coords.longitude; } catch(e) {}
      await fbAdd('sos_reports', { user_id: currentUser.uid, user_name: currentUser.name, incident_type: 'Emergency SOS', severity: 'Critical', latitude: lat, longitude: lng, status: 'active', description: 'SOS button pressed' });
    } catch (err) { console.log('SOS save error:', err); }
  }
}

async function submitReport() {
  showToast('📡 Emergency report submitted! Help is on the way.', 'success');
  if (FIREBASE_CONFIGURED && currentUser) {
    try { await fbAdd('sos_reports', { user_id: currentUser.uid, user_name: currentUser.name, incident_type: 'Report', severity: 'Medium', status: 'active' }); } catch(e) {}
  }
}

// ── Language ──
function changeLang(lang) { showToast(`🌐 Language: ${lang === 'hi' ? 'हिन्दी' : lang === 'pa' ? 'ਪੰਜਾਬੀ' : 'English'}`, 'info'); }

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

async function sendChat() {
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');
  const langSelect = document.getElementById('voice-lang');
  
  const text = input.value.trim();
  if (!text) return;
  
  // Clear input
  input.value = '';
  
  // Add User Message
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.innerHTML = `
    <div class="msg-avatar">U</div>
    <div class="msg-bubble">${text}</div>
  `;
  messages.appendChild(userMsg);
  
  // Scroll down
  messages.scrollTop = messages.scrollHeight;
  
  // Add Typing Indicator
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
    const lang = langSelect ? langSelect.value : 'hi';
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, lang })
    });
    
    if (!res.ok) throw new Error('Network response was not ok');
    
    const data = await readApiJson(res);
    
    // Remove typing indicator
    if (messages.contains(typingMsg)) {
        messages.removeChild(typingMsg);
    }
    
    // Add Bot Message
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg bot';
    botMsg.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">
        ${data.response}
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
      <div class="msg-bubble">Sorry, I couldn't connect to the server right now.</div>
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
  recognition.lang = langSelect ? (langMap[langSelect.value] || 'hi-IN') : 'hi-IN';
  
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
    utterance.lang = langSelect ? (langMap[langSelect.value] || 'hi-IN') : 'hi-IN';
    
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
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch('/api/community/posts', { headers });
    const data = await readApiJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to load posts');
    cachedCommunityPosts = data.posts || [];
    renderCommunityPosts(cachedCommunityPosts);
    loadCommunityStats();
  } catch (err) {
    console.error('Community load error:', err);
    // Show demo data
    cachedCommunityPosts = [
      { id: 1, title: 'Wheat mein yellow spots aa rahe hain — kya karein?', description: 'Mere gehun ki fasal 45 din ki hai...', category: 'Disease', crop: 'Wheat', likes: 3, reply_count: 2, is_solved: 0, user_name: 'Gurpreet Singh', created_at: new Date().toISOString() },
      { id: 2, title: 'DAP ki kami hai market mein — koi alternative batao', description: 'Hamari mandi mein DAP nahi mil raha hai...', category: 'Fertilizer', crop: 'Wheat', likes: 5, reply_count: 3, is_solved: 1, user_name: 'Sunita Devi', created_at: new Date().toISOString() },
      { id: 3, title: 'PM-KISAN ka 14th installment kab aayega?', description: 'Mera PM-KISAN registration hai...', category: 'Scheme', crop: null, likes: 8, reply_count: 4, is_solved: 0, user_name: 'Ramesh Kumar', created_at: new Date().toISOString() },
      { id: 4, title: 'Organic farming mein keede ka ilaaj', description: 'Maine is saal organic farming shuru ki hai...', category: 'Pest Control', crop: 'Tomato', likes: 12, reply_count: 5, is_solved: 1, user_name: 'Kavita Sharma', created_at: new Date().toISOString() },
      { id: 5, title: 'Bore well ka paani kam ho gaya — kya karein?', description: 'Pichle 2 saal se bore well ka water level gir raha hai...', category: 'Irrigation', crop: null, likes: 7, reply_count: 3, is_solved: 0, user_name: 'Mohan Lal', created_at: new Date().toISOString() },
      { id: 6, title: 'Dhan ki Direct Seeding (DSR) ki technique batao', description: 'Is saal DSR try karna chahta hoon...', category: 'General', crop: 'Rice/Paddy', likes: 15, reply_count: 6, is_solved: 0, user_name: 'Harpreet Singh', created_at: new Date().toISOString() },
    ];
    renderCommunityPosts(cachedCommunityPosts);
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
        <div class="comm-post-avatar">${(p.user_name || 'K').charAt(0)}</div>
        <div>
          <div class="comm-post-author">${p.user_name || 'Farmer'}</div>
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
    const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');
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
  const savedToken = localStorage.getItem('token');
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
