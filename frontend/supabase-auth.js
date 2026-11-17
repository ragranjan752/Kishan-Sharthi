// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Supabase Auth Client (Phase 2)
//  Vanilla JS adapter for the static frontend.
//  Loads public config from Express; never uses service role key.
// ═══════════════════════════════════════════════════════

window.SupabaseAuth = (() => {
  let client = null;
  let config = null;
  let initPromise = null;

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    let body = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = null; }
    }
    if (!res.ok) {
      const message = (body && (body.error || body.message)) || `HTTP ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const body = await fetchJson('/api/config/public');
      config = body.data || body;

      if (
        config &&
        config.supabaseUrl &&
        config.supabaseAnonKey &&
        window.supabase &&
        window.supabase.createClient
      ) {
        client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
          },
        });

        client.auth.onAuthStateChange((event, session) => {
          if (session && session.access_token) {
            localStorage.setItem('token', session.access_token);
          } else if (event === 'SIGNED_OUT') {
            localStorage.removeItem('token');
            sessionStorage.removeItem('ks_user');
          }
        });
      }

      return config;
    })();

    return initPromise;
  }

  async function isConfigured() {
    try {
      await init();
    } catch {
      return false;
    }
    return Boolean(client && config && config.supabaseUrl && config.supabaseAnonKey);
  }

  async function isOAuthEnabled() {
    try {
      await init();
    } catch {
      return false;
    }
    return Boolean(config && config.supabaseOAuthEnabled === true);
  }

  async function getSession() {
    await init();
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function getAccessToken() {
    const session = await getSession();
    return session ? session.access_token : null;
  }

  async function signInWithEmail(email, password) {
    await init();
    if (!client) throw new Error('Supabase is not configured');
    return client.auth.signInWithPassword({ email, password });
  }

  async function signUpWithEmail(email, password, metadata = {}) {
    await init();
    if (!client) throw new Error('Supabase is not configured');
    return client.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
  }

  async function signInWithGoogle() {
    await init();
    if (!client) throw new Error('Supabase is not configured');
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await init();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function bootstrapFarmer() {
    const session = await getSession();
    if (!session || !session.access_token) {
      throw new Error('No active Supabase session');
    }
    const body = await fetchJson('/api/v1/farmers/bootstrap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });
    return (body.data && body.data.farmer) || body.farmer;
  }

  function getOAuthErrorFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const error = params.get('error') || hashParams.get('error');
    const errorCode = params.get('error_code') || hashParams.get('error_code');
    const errorDescription = params.get('error_description') || hashParams.get('error_description');
    if (!error && !errorCode) return null;
    return errorDescription || error || errorCode || 'OAuth sign-in failed';
  }

  return {
    init,
    isConfigured,
    isOAuthEnabled,
    getSession,
    getAccessToken,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    bootstrapFarmer,
    getOAuthErrorFromUrl,
  };
})();
