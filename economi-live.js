/**
 * economi-live.js — fetches live economic data from the backend API
 * and passes it to initEconomiCharts() defined in economi.js.
 * Load order in Economi.html: Chart.js → lucide → api.js → economi.js → economi-live.js
 */
window.__economiLiveLoaded = true;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await getEconomicSummary();
    window.ECON_DATA = data;

    // Patch live market data into the static arrays economi.js uses
    if (data.market && Array.isArray(data.market)) {
      patchMarketTable(data.market);
      // FIX: also update the MARKET_DATA JS array that charts read.
      // Previously only the DOM table was patched; charts always showed
      // hardcoded static prices from MARKET_DATA in economi.js.
      patchMarketDataArray(data.market);
    }
    if (data.district_losses && Array.isArray(data.district_losses)) {
      patchDistrictLosses(data.district_losses);
    }
    // FIX: update SHOCK price indicators from live API if provided.
    // Previously SHOCK was never updated so "Wheat Flour +28%" etc. never changed.
    if (data.price_shocks && Array.isArray(data.price_shocks)) {
      patchShockIndicators(data.price_shocks);
    }

    // Now boot all charts with live data
    if (typeof initEconomiCharts === 'function') {
      initEconomiCharts(data);
    }
  } catch (e) {
    console.warn('Economic API unavailable — using static data:', e.message);
    // FIX: show a visible "Demo Data" badge so user knows data is static
    showDemoBadge();
    // Fall back to static charts (economi.js static data is fine for demo)
    if (typeof initEconomiCharts === 'function') {
      initEconomiCharts(null);
    }
  }
});
    }
    if (data.district_losses && Array.isArray(data.district_losses)) {
      patchDistrictLosses(data.district_losses);
    }

    // Now boot all charts with live data
    if (typeof initEconomiCharts === 'function') {
      initEconomiCharts(data);
    }
  } catch (e) {
    console.warn('Economic API unavailable — using static data:', e.message);
    // Fall back to static charts (economi.js static data is fine for demo)
    if (typeof initEconomiCharts === 'function') {
      initEconomiCharts(null);
    }
  }
});

function patchMarketTable(rows) {
  const tbody = document.querySelector('#marketTable tbody');
  if (!tbody || !rows.length) return;
  tbody.innerHTML = rows.map((r) => {
    const prev = parseFloat(r.price_month_ago) || parseFloat(r.price_current) * 0.95;
    const chg = (((parseFloat(r.price_current) - prev) / prev) * 100).toFixed(1);
    const sign = chg >= 0 ? '+' : '';
    const color = chg >= 0 ? '#22c55e' : '#ef4444';
    return `<tr>
      <td>${r.crop_name}</td>
      <td>${r.unit || '40kg bag'}</td>
      <td>Rs ${Number(r.price_current).toLocaleString()}</td>
      <td style="color:${color};font-weight:700">${sign}${chg}%</td>
      <td>${r.shock_cause || '—'}</td>
      <td>${r.severity || 'Medium'}</td>
    </tr>`;
  }).join('');
}

function patchDistrictLosses(rows) {
  const el = document.getElementById('districtLossList');
  if (!el || !rows.length) return;
  el.innerHTML = rows.slice(0, 12).map((r) =>
    `<div class="dist-row"><span>${r.district}</span><span>${r.loss_pct}%</span></div>`
  ).join('');
}

// FIX: sync the MARKET_DATA array used by charts, not just the DOM table
function patchMarketDataArray(rows) {
  if (typeof MARKET_DATA === 'undefined') return;
  rows.forEach((r) => {
    const name = (r.crop_name || '').toLowerCase();
    const existing = MARKET_DATA.find(m => m.crop.toLowerCase().includes(name));
    if (existing) {
      const prev  = parseFloat(r.price_week_ago)  || parseFloat(r.price_current) * 0.98;
      const prevM = parseFloat(r.price_month_ago) || parseFloat(r.price_current) * 0.95;
      existing.cur = parseFloat(r.price_current);
      existing.wk  = prev;
      existing.mo  = prevM;
      if (r.shock_cause) existing.cause = r.shock_cause;
      if (r.severity)    existing.sev   = r.severity.toLowerCase();
    }
  });
}

// FIX: update SHOCK indicators from live API price_shocks data
function patchShockIndicators(shocks) {
  if (typeof SHOCK === 'undefined') return;
  shocks.forEach((s) => {
    const name = (s.label || '').toLowerCase();
    const existing = SHOCK.find(sh => sh.label.toLowerCase().includes(name));
    const sign = s.change >= 0 ? '+' : '';
    if (existing) {
      existing.change = `${sign}${s.change}%`;
      existing.color  = s.change >= 20 ? '#ef4444' : s.change >= 10 ? '#f97316' : '#f59e0b';
    }
  });
  // Re-render shock ticker if the function exists in economi.js
  if (typeof renderShockTicker === 'function') renderShockTicker();
}

// FIX: show a visible "Demo Data" banner when live API is unavailable
function showDemoBadge() {
  const badge = document.createElement('div');
  badge.id = 'demo-badge';
  badge.style.cssText =
    'position:fixed;top:12px;right:16px;z-index:9999;background:#f59e0b;color:#000;' +
    'font-weight:700;font-size:12px;padding:4px 12px;border-radius:20px;';
  badge.textContent = '⚠ Demo Data — Live API unavailable';
  document.body.appendChild(badge);
}
