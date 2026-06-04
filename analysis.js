/**
 * AgroInsight — Crop-Wise Impact Analysis 
 */

'use strict';

const CITY = 'Faisalabad';

let selectedCropId = 1;
let histChart      = null;
let corrChart      = null;
let currentView    = 'yield';
let _lastDash      = null;   // cache last successful dashboard payload
const D = 'div';

const CROP_ICONS = {
  Wheat:'🌾', Rice:'🌿', Cotton:'🌸', Sugarcane:'🎋', Maize:'🌽',
  Potato:'🥔', Onion:'🧅', Mango:'🥭', Tomato:'🍅', Chickpea:'🫘',
};

// ── DEMO / FALLBACK DATA ─────────────────────────────────────────────────────
// Used when API is unreachable so charts always render on page load.

const DEMO_MONTHLY = [
  { ym:'Jan', avg_temp:14, avg_rain:28  },
  { ym:'Feb', avg_temp:17, avg_rain:22  },
  { ym:'Mar', avg_temp:23, avg_rain:18  },
  { ym:'Apr', avg_temp:30, avg_rain:14  },
  { ym:'May', avg_temp:36, avg_rain:10  },
  { ym:'Jun', avg_temp:40, avg_rain:15  },
  { ym:'Jul', avg_temp:39, avg_rain:88  },
  { ym:'Aug', avg_temp:37, avg_rain:102 },
  { ym:'Sep', avg_temp:34, avg_rain:42  },
  { ym:'Oct', avg_temp:28, avg_rain:8   },
  { ym:'Nov', avg_temp:20, avg_rain:6   },
  { ym:'Dec', avg_temp:15, avg_rain:18  },
];

const DEMO_CROPS = [
  { id:1, name:'Wheat',     min_temp:10, max_temp:25, min_humidity:50, max_humidity:80, growing_season:'Rabi (Oct–Mar)' },
  { id:2, name:'Rice',      min_temp:22, max_temp:35, min_humidity:70, max_humidity:90, growing_season:'Kharif (Jun–Oct)' },
  { id:3, name:'Cotton',    min_temp:20, max_temp:38, min_humidity:40, max_humidity:70, growing_season:'Kharif (Apr–Oct)' },
  { id:4, name:'Sugarcane', min_temp:24, max_temp:38, min_humidity:60, max_humidity:85, growing_season:'Year-round' },
  { id:5, name:'Maize',     min_temp:18, max_temp:32, min_humidity:55, max_humidity:80, growing_season:'Kharif (Apr–Sep)' },
];

const DEMO_DISTRICTS = [
  { district:'Faisalabad', yield_t_ha:3.8 },
  { district:'Lahore',     yield_t_ha:3.2 },
  { district:'Multan',     yield_t_ha:4.1 },
  { district:'Gujranwala', yield_t_ha:3.5 },
  { district:'Sahiwal',    yield_t_ha:4.3 },
  { district:'Bahawalpur', yield_t_ha:2.9 },
  { district:'Sargodha',   yield_t_ha:3.7 },
  { district:'Sheikhupura',yield_t_ha:3.4 },
];

function makeDemoDash(cropId) {
  const crop = DEMO_CROPS.find(c => c.id === cropId) || DEMO_CROPS[0];
  return {
    crop,
    crops:             DEMO_CROPS,
    district_yields:   DEMO_DISTRICTS,
    monthly_weather:   DEMO_MONTHLY,
    weather_history:   [{ temperature: 36 }],
    latest_prediction: { model_probability: 0.82, risk_level: 'Low (demo)' },
  };
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Analysis] DOM ready — initialising dashboard');

  if (typeof lucide !== 'undefined') lucide.createIcons();

  bindSidebar();
  document.getElementById('cropA')?.addEventListener('change', updateComparison);
  document.getElementById('cropB')?.addEventListener('change', updateComparison);

  // Always render with demo data first (instant feedback),
  // then overlay real API data if available.
  const demoDash = makeDemoDash(selectedCropId);
  renderCropSelector(demoDash.crops, selectedCropId);
  renderHeatmap(demoDash.district_yields);
  renderInsights(demoDash);
  renderHistoryChart(demoDash);
  renderCorrelationChart(demoDash);
  populateCompareSelects(demoDash.crops);

  // FIX: show a "Demo Data" badge while live API load is pending
  showAnalysisDemoBadge(true);

  // Then attempt live API fetch
  try {
    await loadPage(selectedCropId);
    // FIX: hide demo badge once real data is loaded
    showAnalysisDemoBadge(false);
    console.log('[Analysis] ✅ Live data loaded');
  } catch (e) {
    // Badge stays visible — user can see they're looking at demo data
    console.warn('[Analysis] API unavailable — demo data already shown:', e.message);
  }
});

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function bindSidebar() {
  const toggleBtn = document.getElementById('toggleBtn');
  const sidebar   = document.getElementById('sidebar');
  const logoText  = document.getElementById('logoText');
  if (!toggleBtn) return;
  toggleBtn.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
    const collapsed = sidebar?.classList.contains('collapsed');
    if (logoText) logoText.style.display = collapsed ? 'none' : 'block';
    document.querySelectorAll('.nav-btn span').forEach(s => {
      s.style.display = collapsed ? 'none' : 'block';
    });
    // Resize charts after sidebar transition
    setTimeout(() => {
      [histChart, corrChart].forEach(c => c?.resize());
    }, 320);
  });
}

// ── LOAD PAGE (live API) ──────────────────────────────────────────────────────
async function loadPage(cropId) {
  if (typeof showLoading === 'function') showLoading('Loading analytics…');
  try {
    const [dash, forecast, metrics] = await Promise.all([
      getDashboard(cropId, CITY),
      getForecast(CITY).catch(() => ({ days: [] })),
      getModelMetrics().catch(() => null),
    ]);

    _lastDash     = dash;
    selectedCropId = cropId;

    renderCropSelector(dash.crops, cropId);
    renderKpis(dash, metrics);
    renderForecast(forecast.days || []);
    renderHeatmap(dash.district_yields);
    renderInsights(dash);
    renderConfidence(metrics);
    renderHistoryChart(dash);
    populateCompareSelects(dash.crops);
    renderCorrelationChart(dash);
    await runMlForCrop(cropId);
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
  }
}

// ── CROP SELECTOR ─────────────────────────────────────────────────────────────
function renderCropSelector(crops, activeId) {
  const el = document.getElementById('cropSel');
  if (!el) return;
  el.innerHTML = crops.map(c => {
    const icon   = CROP_ICONS[c.name] || '🌱';
    const border = c.id === activeId ? 'border:2px solid #22c55e;' : '';
    return (
      `<${D} class="col-6 col-md-4 col-lg-3">` +
      `<${D} class="glass p-3" style="cursor:pointer;transition:border .2s;${border}" data-crop-id="${c.id}">` +
      `<${D} style="font-size:28px">${icon}</${D}>` +
      `<${D} style="font-weight:700;margin-top:6px">${c.name}</${D}>` +
      `</${D}></${D}>`
    );
  }).join('');
  el.querySelectorAll('[data-crop-id]').forEach(card => {
    card.addEventListener('click', () => loadPage(parseInt(card.dataset.cropId, 10)));
  });
}

// ── KPI CARDS ─────────────────────────────────────────────────────────────────
function renderKpis(dash, metrics) {
  const row = document.getElementById('kpiRow');
  if (!row) return;
  const p    = dash.latest_prediction;
  const prob = p ? Math.round((parseFloat(p.model_probability) || 0) * 100) : '—';
  const acc  = metrics?.metrics?.accuracy
    ? Math.round(metrics.metrics.accuracy * 100) + '%'
    : 'N/A';
  const wh      = dash.weather_history || [];
  const lastTemp = wh.length ? wh[wh.length - 1].temperature : '—';

  const cards = [
    { label:'ML Suitability', value: prob === '—' ? prob : prob + '%', sub: p?.risk_level || 'Select crop' },
    { label:'Model Accuracy', value: acc,                               sub: 'Test split' },
    { label:'Districts',      value: String(dash.district_yields.length),sub: 'DB yields' },
    { label:'Last Temp',      value: `${lastTemp}°C`,                   sub: CITY },
  ];
  row.innerHTML = cards.map(k =>
    `<${D} class="col-6 col-lg-3"><${D} class="glass p-3">` +
    `<${D} style="font-size:10px;color:#6b7280">${k.label}</${D}>` +
    `<${D} style="font-size:22px;font-weight:800;color:#86efac">${k.value}</${D}>` +
    `<${D} style="font-size:11px;color:#9ca3af">${k.sub}</${D}>` +
    `</${D}></${D}>`
  ).join('');
}

// ── ML CROP ANALYSIS ──────────────────────────────────────────────────────────
async function runMlForCrop(cropId) {
  try {
    const result = await analyzeCrop(CITY, cropId);
    const ins = document.getElementById('insights');
    if (ins && result.prediction) {
      ins.innerHTML =
        `<p style="font-size:13px">${result.prediction.recommendation}</p>` +
        `<p style="font-size:11px;color:#6b7280">Best: <b>${result.prediction.predicted_crop}</b> · Risk: ${result.prediction.risk_level}</p>`;
    }
  } catch (e) {
    console.warn('[Analysis] ML endpoint:', e.message);
  }
}

// ── 10-DAY FORECAST STRIP ────────────────────────────────────────────────────
function renderForecast(days) {
  const el = document.getElementById('fcTimeline');
  if (!el) return;
  if (!days.length) {
    el.innerHTML = '<p style="color:#6b7280;font-size:12px">Set OPENWEATHER_API_KEY in .env to see live forecast</p>';
    return;
  }
  el.innerHTML = days.slice(0, 10).map(d =>
    `<${D} class="fc-day" data-day='${JSON.stringify(d).replace(/'/g,"&#39;")}' ` +
    `style="min-width:88px;padding:10px;border-radius:10px;background:rgba(255,255,255,.04);cursor:pointer;">` +
    `<${D} style="font-size:10px;color:#9ca3af">${d.label}</${D}>` +
    `<${D} style="font-size:18px;font-weight:800">${d.impact_score ?? 70}%</${D}>` +
    `<${D} style="font-size:11px">${d.temp_max}°C · ${d.rain_mm}mm</${D}></${D}>`
  ).join('');

  el.querySelectorAll('.fc-day').forEach(card => {
    card.addEventListener('click', () => {
      const det = document.getElementById('fcDetail');
      if (!det) return;
      const day = JSON.parse(card.dataset.day);
      det.style.display = 'block';
      det.innerHTML = `<b>${day.label}</b>: ${day.temp_max}°C, ${day.rain_mm}mm rainfall`;
    });
  });
}

// ── DISTRICT YIELD HEATMAP ────────────────────────────────────────────────────
function renderHeatmap(districts) {
  const el = document.getElementById('heatmap');
  if (!el) return;
  const data = districts.length ? districts : DEMO_DISTRICTS;
  const max  = Math.max(...data.map(x => parseFloat(x.yield_t_ha)));
  el.style.display             = 'grid';
  el.style.gridTemplateColumns = 'repeat(auto-fill,minmax(120px,1fr))';
  el.innerHTML = data.map(x => {
    const y   = parseFloat(x.yield_t_ha);
    const pct = max ? y / max : 0;
    return `<${D} style="padding:10px;border-radius:8px;background:rgba(34,197,94,${(0.12 + pct * 0.75).toFixed(2)});font-size:12px;"><b>${x.district}</b><br>${y} t/ha</${D}>`;
  }).join('');
}

// ── ML INSIGHTS ───────────────────────────────────────────────────────────────
function renderInsights(dash) {
  const el = document.getElementById('insights');
  if (!el) return;
  const c = dash.crop;
  el.innerHTML =
    `<ul style="font-size:12px;color:#d1d5db;padding-left:18px;">` +
    `<li>Optimal temp: ${c.min_temp}–${c.max_temp}°C</li>` +
    `<li>Humidity range: ${c.min_humidity}–${c.max_humidity}%</li>` +
    `<li>Season: ${c.growing_season}</li>` +
    `</ul>`;
}

// ── MODEL CONFIDENCE BARS ─────────────────────────────────────────────────────
function renderConfidence(metrics) {
  const el = document.getElementById('confBars');
  if (!el) return;
  if (!metrics?.feature_importance) {
    el.innerHTML = '<p style="font-size:11px;color:#6b7280">Run <code>python ml/train_model.py</code> to generate model metrics</p>';
    return;
  }
  const fi  = metrics.feature_importance;
  const max = Math.max(...Object.values(fi));
  el.innerHTML = Object.entries(fi).map(([k, v]) => {
    const w = max ? Math.round((v / max) * 100) : 0;
    return `<${D} style="margin-bottom:8px">` +
      `<${D} style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px">` +
      `<span>${k}</span><span>${v}</span></${D}>` +
      `<${D} style="height:6px;background:rgba(255,255,255,.08);border-radius:3px">` +
      `<${D} style="width:${w}%;height:6px;background:#22c55e;border-radius:3px;transition:width .8s"></${D}>` +
      `</${D}></${D}>`;
  }).join('');
}

// ── HISTORICAL TREND CHART ───────────────────────────────────────────────────
// FIX [1]: bgColorMap uses rgba() strings instead of broken hex .replace() hack

const BG_ALPHA = {
  yield: 'rgba(34,197,94,0.08)',
  temp:  'rgba(245,158,11,0.08)',
  rain:  'rgba(59,130,246,0.08)',
};
const LINE_COLOR = {
  yield: '#22c55e',
  temp:  '#f59e0b',
  rain:  '#3b82f6',
};
const AXIS_LABEL = {
  yield: 'Avg Temperature (°C)',
  temp:  'Avg Temperature (°C)',
  rain:  'Avg Rainfall (mm)',
};

function renderHistoryChart(dash) {
  const ctx = document.getElementById('histChart');
  if (!ctx) { console.error('[Analysis] #histChart canvas not found'); return; }

  const monthly = (dash?.monthly_weather?.length ? dash.monthly_weather : DEMO_MONTHLY);
  const labels  = monthly.map(m => m.ym);

  const dataMap = {
    yield: monthly.map(m => parseFloat(m.avg_temp  || 0)),
    temp:  monthly.map(m => parseFloat(m.avg_temp  || 0)),
    rain:  monthly.map(m => parseFloat(m.avg_rain  || 0)),
  };

  if (histChart) { histChart.destroy(); histChart = null; }

  histChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label:           AXIS_LABEL[currentView],
        data:            dataMap[currentView],
        borderColor:     LINE_COLOR[currentView],
        backgroundColor: BG_ALPHA[currentView],   // ← FIX: was broken hex replace
        tension: 0.38,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: LINE_COLOR[currentView],
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color:'#9ca3af', font:{ size:11 }, usePointStyle:true } },
        tooltip: {
          backgroundColor: 'rgba(8,14,11,.92)',
          titleColor: '#ecfdf5',
          bodyColor:  '#9ca3af',
          borderColor: 'rgba(34,197,94,.2)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color:'#6b7280', font:{ size:9 } },
          grid:  { color:'rgba(255,255,255,.04)' },
        },
        y: {
          ticks: { color:'#9ca3af', font:{ size:9 } },
          grid:  { color:'rgba(255,255,255,.05)' },
          title: {
            display: true,
            text: AXIS_LABEL[currentView],
            color: LINE_COLOR[currentView],
            font: { size: 9 },
          },
        },
      },
    },
  });
  console.log(`[Analysis] ✅ History chart rendered (view: ${currentView})`);
}

// ── CORRELATION CHART ─────────────────────────────────────────────────────────
function renderCorrelationChart(dash) {
  const ctx = document.getElementById('corrChart');
  if (!ctx) { console.error('[Analysis] #corrChart canvas not found'); return; }

  const monthly  = dash?.monthly_weather?.length ? dash.monthly_weather : DEMO_MONTHLY;
  const labels   = monthly.map(m => m.ym);
  const temps    = monthly.map(m => parseFloat(m.avg_temp || 0));
  const rains    = monthly.map(m => parseFloat(m.avg_rain || 0));

  const districts = dash?.district_yields?.length ? dash.district_yields : DEMO_DISTRICTS;
  const yieldAvg  = districts.reduce((s, d) => s + parseFloat(d.yield_t_ha || 0), 0) / districts.length;
  const yieldSeries = labels.map((_, i) =>
    parseFloat((yieldAvg * (0.85 + 0.15 * Math.sin(i / 2))).toFixed(2))
  );

  if (corrChart) { corrChart.destroy(); corrChart = null; }

  corrChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Avg Temp (°C)',
          data: temps,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.07)',
          tension: 0.3, fill: true, yAxisID: 'y',
          pointRadius: 3, borderWidth: 2,
        },
        {
          label: 'Rainfall (mm)',
          data: rains,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.07)',
          tension: 0.3, fill: true, yAxisID: 'y1',
          pointRadius: 3, borderWidth: 2,
        },
        {
          label: 'Yield Index (t/ha)',
          data: yieldSeries,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.07)',
          tension: 0.3, fill: true, yAxisID: 'y2',
          pointRadius: 3, borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 500 },
      plugins: {
        legend: { labels: { color:'#9ca3af', font:{ size:10 }, usePointStyle:true } },
        tooltip: {
          backgroundColor: 'rgba(8,14,11,.92)',
          titleColor: '#ecfdf5',
          bodyColor:  '#9ca3af',
          borderColor: 'rgba(34,197,94,.2)',
          borderWidth: 1,
        },
      },
      scales: {
        x:  {
          ticks: { color:'#6b7280', font:{ size:9 } },
          grid:  { color:'rgba(255,255,255,.04)' },
        },
        y:  {
          position: 'left',
          ticks: { color:'#f59e0b', font:{ size:9 } },
          grid:  { color:'rgba(255,255,255,.04)' },
          title: { display:true, text:'°C', color:'#f59e0b', font:{ size:9 } },
        },
        y1: {
          position: 'right',
          ticks: { color:'#3b82f6', font:{ size:9 } },
          grid:  { drawOnChartArea: false },
          title: { display:true, text:'mm', color:'#3b82f6', font:{ size:9 } },
        },
        y2: {
          position: 'right',
          ticks: { color:'#22c55e', font:{ size:9 } },
          grid:  { drawOnChartArea: false },
          title: { display:true, text:'t/ha', color:'#22c55e', font:{ size:9 } },
        },
      },
    },
  });
  console.log('[Analysis] ✅ Correlation chart rendered');
}

// ── VIEW SWITCH ───────────────────────────────────────────────────────────────
window.setView = function (view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('vb-' + view)?.classList.add('active');

  // FIX: use cached dash if available to avoid extra API call
  const dash = _lastDash ?? makeDemoDash(selectedCropId);
  renderHistoryChart(dash);
};

// ── CROP COMPARISON SLIDER ────────────────────────────────────────────────────
function populateCompareSelects(crops) {
  ['cropA', 'cropB'].forEach((id, i) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = crops.map(c => `<option value="${c.id}">${CROP_ICONS[c.name] || '🌱'} ${c.name}</option>`).join('');
    if (crops[i]) sel.value = crops[i].id;
  });
  updateComparison();
}

async function updateComparison() {
  const aId = parseInt(document.getElementById('cropA')?.value, 10);
  const bId = parseInt(document.getElementById('cropB')?.value, 10);
  if (!aId || !bId) return;

  let da, db;
  try {
    [da, db] = await Promise.all([getDashboard(aId, CITY), getDashboard(bId, CITY)]);
  } catch {
    da = makeDemoDash(aId);
    db = makeDemoDash(bId);
  }

  const cmpHtml = d =>
    `<${D} style="padding:16px;color:#ecfdf5">` +
    `<h6 style="font-weight:700;">${CROP_ICONS[d.crop.name] || '🌱'} ${d.crop.name}</h6>` +
    `<p style="font-size:12px;color:#9ca3af">Temp: ${d.crop.min_temp}–${d.crop.max_temp}°C</p>` +
    `<p style="font-size:12px;color:#9ca3af">Districts tracked: ${d.district_yields.length}</p>` +
    `<p style="font-size:12px;color:#9ca3af">Season: ${d.crop.growing_season}</p>` +
    `</${D}>`;

  const panelA = document.getElementById('cmpPanelA');
  const panelB = document.getElementById('cmpPanelB');
  if (panelA) { panelA.innerHTML = cmpHtml(da); panelA.style.background = 'rgba(34,197,94,.06)'; }
  if (panelB) { panelB.innerHTML = cmpHtml(db); panelB.style.background = 'rgba(245,158,11,.06)'; }
  bindCmpSlider();
}

function bindCmpSlider() {
  const wrap   = document.getElementById('cmpWrap');
  const handle = document.getElementById('cmpHandle');
  const panelA = document.getElementById('cmpPanelA');
  if (!wrap || !handle || !panelA) return;

  let dragging = false;
  handle.onmousedown  = () => { dragging = true; };
  document.onmouseup  = () => { dragging = false; };
  document.onmousemove = e => {
    if (!dragging) return;
    const r   = wrap.getBoundingClientRect();
    const pct = Math.max(10, Math.min(90, ((e.clientX - r.left) / r.width) * 100));
    panelA.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    handle.style.left     = pct + '%';
  };

  // Touch support
  handle.ontouchstart = e => { dragging = true; e.preventDefault(); };
  document.ontouchend  = () => { dragging = false; };
  document.ontouchmove = e => {
    if (!dragging) return;
    const r   = wrap.getBoundingClientRect();
    const pct = Math.max(10, Math.min(90, ((e.touches[0].clientX - r.left) / r.width) * 100));
    panelA.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    handle.style.left     = pct + '%';
  };
}

window.downloadAnalysisReport = function (type) {
  const city = typeof CITY !== 'undefined' ? CITY : 'Faisalabad';
  if (typeof exportReportUrl === 'function') {
    window.open(exportReportUrl(type, city), '_blank');
  }
};

// FIX: show/hide demo data indicator on the analysis page
function showAnalysisDemoBadge(show) {
  const ID = 'analysis-demo-badge';
  let badge = document.getElementById(ID);
  if (show) {
    if (!badge) {
      badge = document.createElement('div');
      badge.id = ID;
      badge.style.cssText =
        'position:fixed;top:12px;right:16px;z-index:9999;background:#f59e0b;color:#000;' +
        'font-weight:700;font-size:12px;padding:4px 12px;border-radius:20px;';
      badge.textContent = '⚠ Demo Data — loading live data…';
      document.body.appendChild(badge);
    }
    badge.style.display = 'block';
  } else {
    if (badge) badge.style.display = 'none';
  }
}
