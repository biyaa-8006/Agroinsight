/**
 * AgroInsight — Settings Page JS
 * Connects to: /Backend/api/user/get_profile.php  (GET)
 *              /Backend/api/user/update_profile.php (POST)
 *
 * All data comes from the DB. No hardcoded values.
 */
'use strict';

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = (type === 'success' ? '✅ ' : '⚠️ ') + msg;
    el.className   = type;
    el.style.display = 'flex';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 3800);
}

// ── POPULATE UI FROM API DATA ─────────────────────────────────────────────────
function populateUI(user, prefs) {
    // Avatar
    const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatar = document.getElementById('avatarInitials');
    if (avatar) avatar.textContent = initials;

    const nameDisp  = document.getElementById('avatarName');
    const emailDisp = document.getElementById('avatarEmail');
    const roleDisp  = document.getElementById('avatarRole');
    if (nameDisp)  nameDisp.textContent  = user.name  || '—';
    if (emailDisp) emailDisp.textContent = user.email || '—';
    if (roleDisp)  roleDisp.textContent  = user.role  || 'farmer';

    // Profile fields
    setVal('fieldName',   user.name   || '');
    setVal('fieldEmail',  user.email  || '');  // email read-only
    setVal('fieldRegion', user.region || '');

    // Preferences
    setVal('prefCity',    prefs.default_city        || '');
    setVal('prefCropId',  prefs.default_crop_id     || '1');
    setVal('prefTimeout', prefs.session_timeout_min || '60');
    setVal('prefTheme',   prefs.theme               || 'dark');
    setVal('prefLang',    prefs.language            || 'en');
    setVal('prefPhone',   prefs.phone               || '');

    // Toggle switches
    setToggle('togAlertEmail',  prefs.alert_email   !== '0');
    setToggle('togAlertSms',    prefs.alert_sms     === '1');
    setToggle('togAlertFlood',  prefs.alert_flood   !== '0');
    setToggle('togAlertDrought',prefs.alert_drought !== '0');
    setToggle('togAlertHeat',   prefs.alert_heat    !== '0');
    setToggle('togAlertPest',   prefs.alert_pest    !== '0');
    setToggle('togPrivacy',     prefs.data_privacy  !== '0');

    // Member since
    const since = document.getElementById('memberSince');
    if (since && user.created_at) {
        since.textContent = new Date(user.created_at).toLocaleDateString('en-PK', {
            day: 'numeric', month: 'long', year: 'numeric',
        });
    }
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function setToggle(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = !!checked;
}

function getToggleVal(id) {
    const el = document.getElementById(id);
    return (el && el.checked) ? '1' : '0';
}

// ── LOAD PROFILE FROM API ─────────────────────────────────────────────────────
async function loadProfile() {
    try {
        // Try backend first
        const data = await apiGet('/user/get_profile.php');
        populateUI(data.user, data.prefs);
        console.log('[Settings] ✅ Profile loaded from DB');
    } catch (e) {
        // Fallback: read from localStorage (set at login)
        console.warn('[Settings] API unavailable, using localStorage:', e.message);
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        if (stored.id) {
            populateUI(stored, {});
            showToast('Loaded local data — connect backend for full settings', 'error');
        } else {
            showToast('Not logged in. Redirecting…', 'error');
            setTimeout(() => { window.location.href = 'login.html'; }, 1800);
        }
    }
}

// ── COLLECT FORM STATE ────────────────────────────────────────────────────────
function collectPayload() {
    const name        = document.getElementById('fieldName')?.value.trim()    || '';
    const region      = document.getElementById('fieldRegion')?.value.trim()  || '';
    const currentPwd  = document.getElementById('fieldCurrentPwd')?.value     || '';
    const newPwd      = document.getElementById('fieldNewPwd')?.value         || '';
    const confirmPwd  = document.getElementById('fieldConfirmPwd')?.value     || '';

    // Client-side password validation
    if (newPwd && newPwd !== confirmPwd) {
        throw new Error('New passwords do not match.');
    }
    if (newPwd && newPwd.length < 6) {
        throw new Error('New password must be at least 6 characters.');
    }

    const prefs = {
        default_city:        document.getElementById('prefCity')?.value.trim()   || 'Faisalabad',
        default_crop_id:     document.getElementById('prefCropId')?.value        || '1',
        session_timeout_min: document.getElementById('prefTimeout')?.value       || '60',
        theme:               document.getElementById('prefTheme')?.value         || 'dark',
        language:            document.getElementById('prefLang')?.value          || 'en',
        alert_email:         getToggleVal('togAlertEmail'),
        alert_sms:           getToggleVal('togAlertSms'),
        alert_flood:         getToggleVal('togAlertFlood'),
        alert_drought:       getToggleVal('togAlertDrought'),
        alert_heat:          getToggleVal('togAlertHeat'),
        alert_pest:          getToggleVal('togAlertPest'),
        data_privacy:        getToggleVal('togPrivacy'),
        phone:               document.getElementById('prefPhone')?.value.trim() || '',
    };

    const payload = { name, region, prefs };
    if (currentPwd && newPwd) {
        payload.current_password = currentPwd;
        payload.new_password     = newPwd;
    }
    return payload;
}

// ── SAVE SETTINGS ─────────────────────────────────────────────────────────────
async function saveSettings() {
    const btn = document.getElementById('btnSave');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
        const payload = collectPayload(); // throws on validation error

        const result = await apiPost('/user/update_profile.php', payload);

        // Update localStorage so other pages see updated name/region
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        stored.name   = document.getElementById('fieldName')?.value.trim()   || stored.name;
        stored.region = document.getElementById('fieldRegion')?.value.trim() || stored.region;
        localStorage.setItem('user', JSON.stringify(stored));

        // ── Persist and apply theme + language immediately ─────────────────
        const savedPrefs = payload.prefs || {};
        try {
            const cachedPrefs = JSON.parse(localStorage.getItem('user_prefs') || '{}');
            const mergedPrefs = Object.assign({}, cachedPrefs, savedPrefs);
            localStorage.setItem('user_prefs', JSON.stringify(mergedPrefs));
            // Live-apply theme and language without a page reload
            if (typeof window.applyUserPreferences === 'function') {
                window.applyUserPreferences(mergedPrefs);
            }
            // FIX: persist session timeout choice as a cookie so bootstrap.php
            // can enforce it on every subsequent request.
            const allowed = ['15', '30', '60', '120', '240'];
            const tm = String(savedPrefs.session_timeout_min || '30');
            if (allowed.includes(tm)) {
                const days = 365;
                document.cookie = `session_timeout_min=${tm};path=/;max-age=${days * 86400};SameSite=Lax`;
            }
        } catch (_) { /* storage unavailable */ }

        // Update avatar display immediately
        const initials = (stored.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const av = document.getElementById('avatarInitials');
        const nm = document.getElementById('avatarName');
        if (av) av.textContent = initials;
        if (nm) nm.textContent = stored.name || '—';

        // Clear password fields after successful save
        ['fieldCurrentPwd', 'fieldNewPwd', 'fieldConfirmPwd'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const updated = result?.updated || [];
        const msg = updated.includes('password')
            ? 'Profile and password updated successfully.'
            : 'Settings saved successfully.';
        showToast(msg, 'success');
        console.log('[Settings] ✅ Updated:', updated);

    } catch (e) {
        showToast(e.message || 'Failed to save settings.', 'error');
        console.error('[Settings] Save error:', e.message);
    } finally {
        if (btn) {
            btn.disabled    = false;
            btn.innerHTML   = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save All Changes';
        }
    }
}

// ── PASSWORD VISIBILITY TOGGLES ───────────────────────────────────────────────
function togglePwVis(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn   = document.getElementById(btnId);
    if (!input || !btn) return;
    const isText  = input.type === 'text';
    input.type    = isText ? 'password' : 'text';
    btn.textContent = isText ? '👁' : '🙈';
}

// ── SESSION CLEAR / LOGOUT ────────────────────────────────────────────────────
async function clearSessionAndLogout() {
    if (!confirm('This will log you out of all sessions. Continue?')) return;
    try {
        await apiPost('/auth/logout.php', {});
    } catch (_) { /* ignore */ }
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ── EXPORT DATA ───────────────────────────────────────────────────────────────
async function exportMyData() {
    try {
        const data = await apiGet('/user/get_profile.php');
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = `agroinsight-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        showToast('Data exported successfully.', 'success');
    } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
    }
}

// ── SIDEBAR TOGGLE ────────────────────────────────────────────────────────────
function initSidebar() {
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar   = document.getElementById('sidebar');
    const logoText  = document.getElementById('logoText');
    if (!toggleBtn || !sidebar) return;
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const collapsed = sidebar.classList.contains('collapsed');
        if (logoText) logoText.style.display = collapsed ? 'none' : 'block';
        document.querySelectorAll('.nav-btn span').forEach(s => {
            s.style.display = collapsed ? 'none' : 'block';
        });
    });
}

// ── POPULATE CROP SELECTOR FROM API ──────────────────────────────────────────
async function loadCropsSelect() {
    try {
        const crops = await getCrops();
        const sel   = document.getElementById('prefCropId');
        if (!sel || !crops?.length) return;
        const curVal = sel.value;
        sel.innerHTML = crops.map(c =>
            `<option value="${c.id}">${c.name}</option>`
        ).join('');
        sel.value = curVal || '1';
    } catch (_) { /* keep hardcoded fallback in HTML */ }
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    initSidebar();

    document.getElementById('btnSave')?.addEventListener('click', saveSettings);
    document.getElementById('btnExport')?.addEventListener('click', exportMyData);
    document.getElementById('btnLogoutAll')?.addEventListener('click', clearSessionAndLogout);

    // Password visibility toggles
    document.getElementById('btnToggleCurPwd')?.addEventListener('click',
        () => togglePwVis('fieldCurrentPwd', 'btnToggleCurPwd'));
    document.getElementById('btnToggleNewPwd')?.addEventListener('click',
        () => togglePwVis('fieldNewPwd', 'btnToggleNewPwd'));
    document.getElementById('btnToggleCnfPwd')?.addEventListener('click',
        () => togglePwVis('fieldConfirmPwd', 'btnToggleCnfPwd'));

    await loadProfile();
    await loadCropsSelect();
});
