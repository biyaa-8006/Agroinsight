/**
 * AgroInsight — Logout handler
 * FIX: now sends a POST request with CSRF token before clearing session.
 * Previously the logout endpoint accepted GET requests with no CSRF,
 * allowing any page to silently log out users via <img src="logout.php">.
 */
'use strict';

(async function doLogout() {
  try {
    // Get CSRF token, then POST to logout endpoint
    const tokenRes = await fetch(
      (window.AGRO_API_BASE || 'http://localhost/agroinsight/Backend/api') + '/csrf/token.php',
      { credentials: 'include' }
    );
    const tokenData = await tokenRes.json();
    const csrfToken = tokenData?.data?.token || '';

    await fetch(
      (window.AGRO_API_BASE || 'http://localhost/agroinsight/Backend/api') + '/auth/logout.php',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify({}),
      }
    );
  } catch (_) {
    // Network error or server down — clear local state anyway
  }

  // Always clear local storage
  localStorage.removeItem('user');
  localStorage.removeItem('user_prefs');
})();

// Countdown timer → redirect to login
let secs = 15;
const fill  = document.getElementById('timerFill');
const count = document.getElementById('countdown');

if (fill) {
  fill.style.transition = 'width ' + secs + 's linear';
  setTimeout(() => { fill.style.width = '0%'; }, 50);
}

const interval = setInterval(() => {
  secs--;
  if (count) count.textContent = secs;
  if (secs <= 0) {
    clearInterval(interval);
    window.location.href = 'login.html';
  }
}, 1000);
