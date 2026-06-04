/**
 * AgroInsight — User Preferences (theme + language)
 * ─────────────────────────────────────────────────
 * Include this script BEFORE any page-specific JS on every
 * authenticated page.  It:
 *   1. Reads cached prefs from localStorage immediately
 *      (zero-flash: theme applied before first paint via inline
 *       CSS variable override on <html>)
 *   2. After page load, fetches fresh prefs from the API and
 *      re-applies if anything changed.
 *   3. Exports window.applyUserPreferences() so Settings.js
 *      can call it after saving.
 *
 * Storage key: 'user_prefs'  (object with 'theme' and 'language')
 */

'use strict';

// ── 1. APPLY PREFERENCES (THEME + LANGUAGE) ──────────────────────────────────
/**
 * @param {{ theme?: string, language?: string }} prefs
 */
function applyUserPreferences(prefs) {
    if (!prefs) return;

    // ── Theme ──────────────────────────────────────────────────────────────
    const theme = prefs.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // ── Language / direction ───────────────────────────────────────────────
    const lang = prefs.language || 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'ur' ? 'rtl' : 'ltr';

    // Urdu font (Noto Nastaliq) — inject link once
    if (lang === 'ur') {
        if (!document.getElementById('urdu-font-link')) {
            const link = document.createElement('link');
            link.id   = 'urdu-font-link';
            link.rel  = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap';
            document.head.appendChild(link);
        }
        document.body.style.fontFamily = "'Noto Nastaliq Urdu', serif";

        // FIX: show a notice that full Urdu translation is not yet implemented.
        // Previously: selecting Urdu only changed layout to RTL + font; all UI
        // text remained in English. This was silently misleading. A notice is shown
        // until a proper i18n translation dictionary is added.
        if (!document.getElementById('urdu-translation-notice')) {
            const notice = document.createElement('div');
            notice.id = 'urdu-translation-notice';
            notice.style.cssText =
                'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);' +
                'z-index:9998;background:#1e293b;border:1px solid #f59e0b;color:#fcd34d;' +
                'font-size:12px;padding:8px 16px;border-radius:8px;text-align:center;max-width:320px;';
            notice.textContent =
                'اردو ترجمہ ابھی نامکمل ہے — صرف لے آؤٹ تبدیل ہوا ہے۔ ' +
                '(Urdu translation not yet complete — layout only)';
            document.body.appendChild(notice);
            setTimeout(() => { notice.style.display = 'none'; }, 6000);
        }
    } else {
        document.body.style.fontFamily = '';
        const notice = document.getElementById('urdu-translation-notice');
        if (notice) notice.style.display = 'none';
    }

    // Persist to cache
    try {
        const cached = JSON.parse(localStorage.getItem('user_prefs') || '{}');
        cached.theme    = theme;
        cached.language = lang;
        localStorage.setItem('user_prefs', JSON.stringify(cached));
    } catch (_) { /* storage may be unavailable */ }
}

// ── 2. IMMEDIATE APPLY (before DOMContentLoaded to avoid flash) ───────────────
(function immediateApply() {
    try {
        const cached = JSON.parse(localStorage.getItem('user_prefs') || '{}');
        if (cached.theme || cached.language) {
            applyUserPreferences(cached);
        }
    } catch (_) { /* ignore */ }
})();

// ── 3. FETCH FRESH PREFS FROM API AFTER PAGE LOAD ────────────────────────────
async function refreshPrefsFromApi() {
    const base = window.AGRO_API_BASE || 'http://localhost/agroinsight/Backend/api';
    try {
        const res = await fetch(`${base}/user/get_profile.php`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!res.ok) return; // not logged in or server down — ignore silently
        const data = await res.json();
        if (data?.success && data?.data?.prefs) {
            const prefs = data.data.prefs;
            applyUserPreferences(prefs);
            // Also store the full prefs object for Settings page to read
            localStorage.setItem('user_prefs', JSON.stringify(prefs));
        }
    } catch (_) { /* network unavailable — use cached */ }
}

document.addEventListener('DOMContentLoaded', refreshPrefsFromApi);

// Expose globally so Settings.js can call it after saving
window.applyUserPreferences = applyUserPreferences;
