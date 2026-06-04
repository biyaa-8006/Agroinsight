/**
 * AgroInsight — Weather Dashboard
 */

'use strict';

const DEFAULT_CITY = 'Faisalabad';

// Chart instances — kept at module scope so we can destroy before re-render
let tempChart     = null;
let forecastChart = null;

// ── DEMO / FALLBACK DATA ─────────────────────────────────────────────────────
// Shown whenever the API is unreachable or returns empty data.

const DEMO_TEMP_RECORDS = (() => {
  const now  = Date.now();
  const hour = 3_600_000;
  return Array.from({ length: 24 }, (_, i) => ({
    recorded_at: new Date(now - (23 - i) * hour).toISOString(),
    temperature: +(28 + 10 * Math.sin((i / 24) * Math.PI * 2) + (Math.random() - 0.5) * 2).toFixed(1),
  }));
})();

const DEMO_FORECAST_DAYS = (() => {
  const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const temps = [38, 41, 37, 35, 33, 36, 39];
  const rains = [0, 2, 18, 5, 0, 0, 12];
  return days.map((d, i) => ({ label: d, temp_max: temps[i], rain_mm: rains[i] }));
})();

const DEMO_LIVE_WEATHER = {
  temperature: 36,
  humidity:    48,
  wind_speed:  4.2,
  feels_like:  39,
  condition:   'Partly Cloudy (demo)',
  city:        DEFAULT_CITY,
};

// ── CLOCK ─────────────────────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('time');
  if (el) {
    el.textContent = new Date().toLocaleString('en-PK', {
      hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
    });
  }
}

// ── LIVE WEATHER PANEL ────────────────────────────────────────────────────────
function renderLive(w) {
  const set = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  set('temp',      `${w.temperature}°C`);
  set('humidity',  `${w.humidity}%`);
  set('wind',      `${w.wind_speed} m/s`);
  set('rain',      '—');
  set('condition', w.condition);
  set('feelsLike', `Feels like ${w.feels_like}°C · ${w.city}`);

  const loc = document.querySelector('.location span');
  if (loc) loc.textContent = `${w.city}, Pakistan`;
}

// ── 24-HOUR TEMPERATURE CHART ─────────────────────────────────────────────────
function renderTempChart(records) {
  const ctx = document.getElementById('tempChart');
  if (!ctx) { console.error('[Weather] #tempChart canvas not found'); return; }

  // Ensure data even if API returned nothing
  if (!records || !records.length) {
    console.warn('[Weather] No temp history from API — using demo data');
    records = DEMO_TEMP_RECORDS;
    showWeatherDemoBadge('tempChart');
  }

  const labels = records.map(r =>
    new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const temps = records.map(r => parseFloat(r.temperature));

  if (tempChart) { tempChart.destroy(); tempChart = null; }

  tempChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Temperature (°C)',
        data: temps,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.12)',
        fill: true,
        tension: 0.38,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#22c55e',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,   // ← lets the CSS height control the canvas
      animation: { duration: 600 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#9ca3af', font: { size: 11 }, usePointStyle: true },
        },
        tooltip: {
          backgroundColor: 'rgba(8,14,11,.92)',
          titleColor: '#ecfdf5',
          bodyColor:  '#9ca3af',
          borderColor: 'rgba(34,197,94,.25)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: '#6b7280', font: { size: 9 }, maxTicksLimit: 8 },
          grid:  { color: 'rgba(255,255,255,.04)' },
        },
        y: {
          beginAtZero: false,
          ticks: { color: '#9ca3af', font: { size: 9 } },
          grid:  { color: 'rgba(255,255,255,.06)' },
        },
      },
    },
  });
  console.log(`[Weather] ✅ Temperature chart rendered (${records.length} points)`);
}

// ── 7-DAY FORECAST CHART ──────────────────────────────────────────────────────
function renderForecastChart(days) {
  const ctx = document.getElementById('forecastChart');
  if (!ctx) { console.error('[Weather] #forecastChart canvas not found'); return; }

  // Ensure data even if API returned nothing
  if (!days || !days.length) {
    console.warn('[Weather] No forecast days from API — using demo data');
    days = DEMO_FORECAST_DAYS;
    showWeatherDemoBadge('forecastChart');
  }

  const slice = days.slice(0, 7);

  if (forecastChart) { forecastChart.destroy(); forecastChart = null; }

  forecastChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: slice.map(d => d.label),
      datasets: [
        {
          label: 'Max Temp (°C)',
          data: slice.map(d => d.temp_max),
          backgroundColor: 'rgba(34,197,94,0.55)',
          borderColor:     '#22c55e',
          borderWidth: 1,
          borderRadius: 6,
          yAxisID: 'y',
        },
        {
          label: 'Rainfall (mm)',
          data: slice.map(d => d.rain_mm),
          backgroundColor: 'rgba(59,130,246,0.45)',
          borderColor:     '#3b82f6',
          borderWidth: 1,
          borderRadius: 6,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,   // ← lets the CSS height control the canvas
      animation: { duration: 600 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#9ca3af', font: { size: 11 }, usePointStyle: true },
        },
        tooltip: {
          backgroundColor: 'rgba(8,14,11,.92)',
          titleColor: '#ecfdf5',
          bodyColor:  '#9ca3af',
          borderColor: 'rgba(34,197,94,.25)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: '#6b7280', font: { size: 10 } },
          grid:  { color: 'rgba(255,255,255,.04)' },
        },
        y: {
          position: 'left',
          ticks: { color: '#22c55e', font: { size: 9 } },
          grid:  { color: 'rgba(255,255,255,.05)' },
          title: { display: true, text: '°C', color: '#22c55e', font: { size: 9 } },
        },
        y1: {
          position: 'right',
          ticks: { color: '#3b82f6', font: { size: 9 } },
          grid:  { drawOnChartArea: false },
          title: { display: true, text: 'mm', color: '#3b82f6', font: { size: 9 } },
        },
      },
    },
  });
  console.log(`[Weather] ✅ Forecast chart rendered (${slice.length} days)`);
}

// ── TREND ANALYSIS PANEL ──────────────────────────────────────────────────────
function renderTrendPanel(analysis) {
  const ticker = document.querySelector('.track');
  if (!ticker) return;
  const t = analysis.temperature;
  const h = analysis.humidity;
  ticker.textContent =
    `📈 Temp trend: ${t.trend} (avg ${t.mean}°C) · ` +
    `💧 Humidity: ${h.trend} (${h.mean}%) · ` +
    `🌬 Wind: ${analysis.wind_speed.trend} · ` +
    `Based on ${analysis.record_count} logged readings`;
}

// ── MAIN DASHBOARD LOADER ─────────────────────────────────────────────────────
async function loadDashboard(city) {
  const refreshIcon = document.getElementById('refreshIcon');
  if (refreshIcon) refreshIcon.classList.add('spin');

  // Show loading if api.js helper available
  if (typeof showLoading === 'function') showLoading('Fetching live weather…');

  try {
    // Run all API calls in parallel; each has an individual fallback
    const [live, forecast, history, trends] = await Promise.all([
      (async () => {
        try { return await getWeather(city); }
        catch (e) { console.warn('[Weather] Live weather API failed:', e.message); return null; }
      })(),
      (async () => {
        try { return await getForecast(city); }
        catch (e) { console.warn('[Weather] Forecast API failed:', e.message); return null; }
      })(),
      (async () => {
        try { return await getWeatherHistory(city, 48); }
        catch (e) { console.warn('[Weather] History API failed:', e.message); return null; }
      })(),
      (async () => {
        try { return await getWeatherAnalysis(city, 30); }
        catch (e) { console.warn('[Weather] Analysis API failed:', e.message); return null; }
      })(),
    ]);

    // ── Live panel ─────────────────────────────────────────────────────────
    renderLive(live ?? DEMO_LIVE_WEATHER);

    // ── Temperature history chart ──────────────────────────────────────────
    // FIX: always render — pass null if API failed; renderTempChart handles fallback
    renderTempChart(history?.records ?? null);

    // ── Forecast chart ────────────────────────────────────────────────────
    // FIX: always render — pass null if API failed; renderForecastChart handles fallback
    renderForecastChart(forecast?.days ?? null);

    // ── Trend ticker ──────────────────────────────────────────────────────
    if (trends?.analysis) renderTrendPanel(trends.analysis);

    console.log('[Weather] ✅ Dashboard loaded successfully');

  } catch (err) {
    // Catastrophic failure — still render charts with demo data
    console.error('[Weather] Dashboard load error:', err);
    renderLive(DEMO_LIVE_WEATHER);
    renderTempChart(null);
    renderForecastChart(null);
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
    if (refreshIcon) refreshIcon.classList.remove('spin');
  }
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Weather] DOM ready — initialising dashboard');

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Sidebar toggle
  const toggleBtn = document.getElementById('toggleBtn');
  const sidebar   = document.getElementById('sidebar');
  const logoText  = document.getElementById('logoText');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const collapsed = sidebar.classList.contains('collapsed');
      if (logoText) logoText.style.display = collapsed ? 'none' : 'block';
      document.querySelectorAll('.nav-btn span').forEach(s => {
        s.style.display = collapsed ? 'none' : 'block';
      });
      // Resize charts after sidebar animation completes
      setTimeout(() => {
        [tempChart, forecastChart].forEach(c => c?.resize());
      }, 320);
    });
  }

  // Search
  const searchBtn = document.getElementById('searchBtn');
  const cityInput = document.getElementById('cityInput');
  searchBtn?.addEventListener('click', () => loadDashboard(cityInput?.value?.trim() || DEFAULT_CITY));
  cityInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loadDashboard(cityInput.value.trim() || DEFAULT_CITY);
  });

  // Refresh
  document.getElementById('refreshBtn')?.addEventListener('click', () =>
    loadDashboard(cityInput?.value?.trim() || DEFAULT_CITY)
  );

  // Clock
  updateClock();
  setInterval(updateClock, 60_000);

  // Initial load
  loadDashboard(DEFAULT_CITY);
});

// FIX: show a "Demo" label above charts that are rendering synthetic data
function showWeatherDemoBadge(chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  const existing = canvas.parentElement.querySelector('.weather-demo-badge');
  if (existing) return;
  const badge = document.createElement('div');
  badge.className = 'weather-demo-badge';
  badge.style.cssText =
    'display:inline-block;background:#f59e0b;color:#000;font-weight:700;' +
    'font-size:11px;padding:2px 10px;border-radius:12px;margin-bottom:4px;';
  badge.textContent = '⚠ Demo Data';
  canvas.parentElement.insertBefore(badge, canvas);
}
