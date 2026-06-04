/**
 * AgroInsight — shared API client
 * Fixes: CSRF token support, input validation, error handling
 */
// FIX: use centralized config — edit config.js or set a <meta name="agro-api-base"> to change the API base URL
const API_BASE = window.AGRO_API_BASE || 'http://localhost/agroinsight/Backend/api';

// ── CSRF TOKEN ────────────────────────────────────────────────
let _csrfToken = '';
async function ensureCsrfToken() {
  if (_csrfToken) return _csrfToken;
  try {
    const res = await fetch(`${API_BASE}/csrf/token.php`, { credentials: 'include' });
    const data = await res.json();
    _csrfToken = data?.data?.token || '';
  } catch (e) {
    console.warn('CSRF token fetch failed:', e.message);
  }
  return _csrfToken;
}

// ── INPUT VALIDATION ──────────────────────────────────────────
const INPUT_RANGES = {
  N:          { min: 0,   max: 300 },  // Nitrogen mg/kg
  P:          { min: 0,   max: 200 },  // Phosphorus mg/kg
  K:          { min: 0,   max: 300 },  // Potassium mg/kg
  ph:         { min: 0,   max: 14  },
  temperature:{ min: -10, max: 60  },  // °C
  humidity:   { min: 0,   max: 100 },  // %
  rainfall:   { min: 0,   max: 5000 }, // mm
};

function validateInputRanges(body) {
  if (!body || typeof body !== 'object') return null;
  for (const [key, range] of Object.entries(INPUT_RANGES)) {
    if (key in body) {
      const val = parseFloat(body[key]);
      if (isNaN(val) || val < range.min || val > range.max) {
        return `${key} must be between ${range.min} and ${range.max}`;
      }
    }
  }
  return null;
}

// ── LOADING OVERLAY ───────────────────────────────────────────
function showLoading(msg = 'Loading…') {
  let el = document.getElementById('api-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'api-loading';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText =
      'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;color:#86efac;font-weight:600;font-family:system-ui';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'flex';
}

function hideLoading() {
  const el = document.getElementById('api-loading');
  if (el) el.style.display = 'none';
}

// ── CORE REQUEST ──────────────────────────────────────────────
async function apiRequest(method, path, body = null, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${qs ? '?' + qs : ''}`;

  const opts = { method, credentials: 'include' };
  if (body) {
    // Client-side range validation before sending
    const validationErr = validateInputRanges(body);
    if (validationErr) {
      throw new Error('Validation error: ' + validationErr);
    }

    const token = await ensureCsrfToken();
    opts.headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'X-CSRF-Token': token } : {}),
    };
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, opts);
  } catch (networkErr) {
    throw new Error('Network error — is the backend running? ' + networkErr.message);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON (status ${res.status}). Check PHP errors.`);
  }

  if (!data.success) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data.data;
}

async function apiGet(path, params = {}, showLoader = false) {
  if (showLoader) showLoading();
  try {
    return await apiRequest('GET', path, null, params);
  } finally {
    if (showLoader) hideLoading();
  }
}

async function apiPost(path, body, showLoader = false) {
  if (showLoader) showLoading();
  try {
    return await apiRequest('POST', path, body);
  } finally {
    if (showLoader) hideLoading();
  }
}

// ── AUTH ──────────────────────────────────────────────────────
function registerUser(name, email, password, region = 'Punjab') {
  return apiPost('/auth/register.php', { name, email, password, region });
}

async function loginUser(email, password) {
  const data = await apiPost('/auth/login.php', { email, password });
  localStorage.setItem('user', JSON.stringify(data));
  _csrfToken = ''; // refresh CSRF after login
  return data;
}

// ── CROP APIs ─────────────────────────────────────────────────
function getCrops() {
  return apiGet('/crops/get_crops.php');
}

// ── WEATHER APIs ──────────────────────────────────────────────
function getWeather(city) {
  return apiGet('/weather/get_weather.php', { city });
}

function getForecast(city) {
  return apiGet('/weather/get_forecast.php', { city });
}

function getWeatherHistory(city, limit = 40) {
  return apiGet('/weather/get_weather_history.php', { city, limit });
}

function getWeatherAnalysis(city, limit = 30) {
  return apiGet('/weather/history_analysis.php', { city, limit });
}

function analyzeCrop(city, cropId) {
  return apiGet('/weather/analyze_crop.php', { city, crop_id: cropId }, true);
}

// ── ANALYTICS APIs ────────────────────────────────────────────
function getDashboard(cropId, city = 'Faisalabad') {
  return apiGet('/analytics/get_dashboard.php', { crop_id: cropId, city }, true);
}

function getPredictions(cropId = 0, limit = 15) {
  const p = { limit };
  if (cropId) p.crop_id = cropId;
  return apiGet('/analytics/get_predictions.php', p);
}

function getLocationRisk(cropId) {
  return apiGet('/analytics/get_location_risk.php', { crop_id: cropId });
}

function getModelMetrics() {
  return apiGet('/analytics/get_model_metrics.php');
}

// ── ECONOMICS ─────────────────────────────────────────────────
function getEconomicSummary() {
  return apiGet('/economics/get_summary.php', {}, true);
}

// ── ALERTS ───────────────────────────────────────────────────
function getAlerts(page = 1, limit = 20) {
  return apiGet('/alerts/get_alerts.php', { page, limit });
}

function createAlert(payload) {
  return apiPost('/alerts/create_alerts.php', payload, true);
}

function markAlertRead(id, all = false) {
  return apiPost('/alerts/mark_read.php', all ? { all: true } : { id });
}

function getReminders() {
  return apiGet('/alerts/get_reminders.php');
}

function sendSms(message, phone = '', broadcast = false) {
  return apiPost('/notifications/send_sms.php', { message, phone, broadcast }, true);
}

function exportReportUrl(type = 'weather', city = 'Faisalabad', format = 'csv') {
  const qs = new URLSearchParams({ type, city, format }).toString();
  return `${API_BASE}/reports/export_report.php?${qs}`;
}

function exportReportHtml(type = 'weather', city = 'Faisalabad') {
  window.open(exportReportUrl(type, city, 'html'), '_blank');
}

function getHomeStats(city = 'Faisalabad') {
  return apiGet('/public/get_home_stats.php', { city });
}

// ── ADMIN ─────────────────────────────────────────────────────
function adminGetStats() {
  return apiGet('/admin/get_stats.php');
}

function adminGetUsers(page = 1, limit = 20) {
  return apiGet('/admin/get_users.php', { page, limit });
}

function adminCreateUser(body) {
  return apiPost('/admin/create_user.php', body, true);
}

function adminUpdateUser(body) {
  return apiPost('/admin/update_user.php', body, true);
}

function adminDeleteUser(id) {
  return apiPost('/admin/delete_user.php', { id }, true);
}

function adminGetCrops() {
  return getCrops();
}

function adminUpdateCrop(body) {
  return apiPost('/admin/update_crop.php', body, true);
}

function adminCreateCrop(body) {
  return apiPost('/admin/create_crop.php', body, true);
}

function adminDeleteCrop(id) {
  return apiPost('/admin/delete_crop.php', { id }, true);
}

function adminGetConfig() {
  return apiGet('/admin/get_config.php');
}

function adminUpdateConfig(config) {
  return apiPost('/admin/update_config.php', { config }, true);
}

// ── CONTACT ──────────────────────────────────────────────────
function submitContact(form) {
  return apiPost('/contact/submit.php', form, true);
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function requireAdminPage() {
  const u = getCurrentUser();
  if (!u || u.role !== 'admin') {
    window.location.href = '../login.html';
    return false;
  }
  return true;
}
