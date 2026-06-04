/**
 * AgroInsight — Login Page 
 */

'use strict';

// ── CONFIG ────────────────────────────────────────────────────────────────────
// FIX: use centralized config — edit config.js or set a <meta name="agro-api-base"> to change the API base URL
const BASE_URL = window.AGRO_API_BASE || 'http://localhost/agroinsight/Backend/api';
window.AGRO_API_BASE = BASE_URL;

// ── ERROR / SUCCESS DISPLAY ───────────────────────────────────────────────────
function showMessage(msg, type = 'error') {
  let el = document.getElementById('loginMsg');
  if (!el) {
    el = document.createElement('p');
    el.id = 'loginMsg';
    el.style.cssText = 'font-size:13px;margin:8px 0 4px;text-align:center;padding:8px 12px;border-radius:8px;';
    const btn = document.getElementById('loginBtn');
    btn?.parentNode?.insertBefore(el, btn);
  }
  const styles = {
    error:   'color:#fca5a5;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);',
    success: 'color:#86efac;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);',
    warning: 'color:#fcd34d;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);',
  };
  el.style.cssText += styles[type] || styles.error;
  el.innerHTML = msg;
}

function clearMessage() {
  const el = document.getElementById('loginMsg');
  if (el) el.innerHTML = '';
}

// ── CONNECTIVITY CHECK ────────────────────────────────────────────────────────
// Quickly pings the backend before login attempt to give a clear error
// if XAMPP/Apache is not running.
async function checkServerReachable() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${BASE_URL}/csrf/token.php`, {
      method: 'GET',
      credentials: 'include',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.status < 500;   // 200 or 401 both mean server is up
  } catch {
    return false;
  }
}

// ── MAIN LOGIN HANDLER ────────────────────────────────────────────────────────
async function doLogin() {
  const emailEl = document.getElementById('email');
  const passEl  = document.getElementById('password');
  const btn     = document.getElementById('loginBtn');

  const email    = emailEl?.value.trim()  || '';
  const password = passEl?.value          || '';

  clearMessage();

  // Client-side validation
  if (!email || !password) {
    showMessage('⚠ Email and password are required.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage('⚠ Please enter a valid email address.');
    return;
  }

  if (btn) {
    btn.disabled   = true;
    btn.textContent = 'Signing in…';
  }

  // ── Step 1: check server is reachable first ──────────────────────────────
  const reachable = await checkServerReachable();
  if (!reachable) {
    showMessage(
      '🔴 <strong>Cannot reach the backend server.</strong><br>' +
      'Please make sure:<br>' +
      '&nbsp;• XAMPP is running (Apache + MySQL both green)<br>' +
      '&nbsp;• You are visiting <code>http://localhost/...</code>, not a file:// path<br>' +
      '&nbsp;• The <code>agroinsight</code> database has been imported',
      'error'
    );
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In to Dashboard'; }
    return;
  }

  // ── Step 2: attempt login ────────────────────────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/auth/login.php`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ email, password }),
    });

    // ── Step 3: parse JSON safely ──────────────────────────────────────────
    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      // Server returned non-JSON (PHP error, 500 page, etc.)
      console.error('[Login] Server returned non-JSON. HTTP', res.status, parseErr);
      showMessage(
        `🔴 <strong>Server error (HTTP ${res.status})</strong><br>` +
        'The backend returned an unexpected response (not JSON).<br>' +
        'Check your XAMPP PHP error log for details.<br>' +
        '<small>Common cause: PHP fatal error in a backend file.</small>'
      );
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In to Dashboard'; }
      return;
    }

    // ── Step 4: handle response ────────────────────────────────────────────
    if (data.success) {
      localStorage.setItem('user', JSON.stringify(data.data));

      // ── Fetch and cache user preferences so every page starts ──────────
      // with the correct theme/language before the API call completes.
      try {
        const prefRes = await fetch(`${BASE_URL}/user/get_profile.php`, {
          method: 'GET',
          credentials: 'include',
        });
        if (prefRes.ok) {
          const prefData = await prefRes.json();
          if (prefData?.success && prefData?.data?.prefs) {
            localStorage.setItem('user_prefs', JSON.stringify(prefData.data.prefs));
          }
        }
      } catch (_) { /* non-critical — preferences will load on first page */ }

      showMessage('✅ Login successful! Redirecting…', 'success');
      const params = new URLSearchParams(location.search);
      let dest = params.get('redirect') || '';
      if (!dest) {
        dest = data.data.role === 'admin' ? 'admin/index.html' : 'Weather.html';
      }
      setTimeout(() => { window.location.href = dest; }, 600);
    } else {
      // Server returned {success:false, error:'...'} — show the real message
      const msg = data.error || 'Login failed. Please check your credentials.';
      console.warn('[Login] Auth failed:', msg);
      showMessage('⚠ ' + msg);
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In to Dashboard'; }
    }

  } catch (networkErr) {
    // fetch() itself threw — genuine network/CORS failure
    console.error('[Login] fetch() threw:', networkErr);
    showMessage(
      '🔴 <strong>Network error — cannot connect to server.</strong><br>' +
      'Make sure XAMPP Apache is running on port 80.<br>' +
      '<small>' + networkErr.message + '</small>'
    );
    if (btn) { btn.disabled = false; btn.textContent = 'Sign In to Dashboard'; }
  }
}

// ── DOM READY ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Show "account created" banner when arriving from registration
  if (new URLSearchParams(location.search).get('registered') === '1') {
    showMessage('✅ Account created! Please sign in.', 'success');
  }

  // Button click
  document.getElementById('loginBtn')?.addEventListener('click', doLogin);

  // Enter key on either input field
  ['email', 'password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  });

  // Password visibility toggle
  const toggleBtn = document.getElementById('togglePassword');
  const passInput = document.getElementById('password');
  if (toggleBtn && passInput) {
    toggleBtn.addEventListener('click', () => {
      const isText = passInput.type === 'text';
      passInput.type = isText ? 'password' : 'text';
      toggleBtn.textContent = isText ? '👁' : '🙈';
    });
  }
});
