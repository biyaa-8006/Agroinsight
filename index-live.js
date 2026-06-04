/**
 * Home page — live weather widget from API.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const city = 'Faisalabad';
  const base = window.AGRO_API_BASE || 'http://localhost/agroinsight/Backend/api';
  try {
    const res = await fetch(`${base}/public/get_home_stats.php?city=${encodeURIComponent(city)}`);
    const json = await res.json();
    if (!json.success || !json.data) return;
    const d = json.data;
    const w = d.weather;
    if (w) {
      setText('.dash-title', `Live Dashboard — ${w.city}`);
      setText('.w-box:nth-child(1) .w-val', `${w.temperature}°`);
      setText('.w-box:nth-child(2) .w-val', `${w.humidity}%`);
      setText('.w-box:nth-child(3) .w-val', `${w.wind_speed}`);
      setText('.w-box:nth-child(4) .w-val', `${w.rainfall}%`);
    }
    if (d.crop_yields && d.crop_yields.length) {
      const rows = document.querySelectorAll('.crop-row');
      d.crop_yields.forEach((c, i) => {
        if (!rows[i]) return;
        rows[i].querySelector('.crop-name').textContent = c.name;
        const pct = Math.min(100, Math.max(10, parseInt(c.yield_pct, 10) || 70));
        rows[i].querySelector('.crop-fill').style.width = pct + '%';
        rows[i].querySelector('.crop-pct').textContent = pct + '%';
      });
    }
    const riskEl = document.querySelector('.mini-card .mc-val');
    if (riskEl && d.risk_level) {
      const rl = String(d.risk_level).charAt(0).toUpperCase() + String(d.risk_level).slice(1);
      riskEl.textContent = rl;
      riskEl.style.color = rl === 'High' ? '#ef4444' : rl === 'Low' ? '#22c55e' : '#EF9F27';
    }
    const confEl = document.querySelectorAll('.mini-card .mc-val')[1];
    if (confEl && d.confidence) {
      confEl.innerHTML = `${d.confidence}<span style="font-size:14px;">%</span>`;
    }
    const cropStat = document.querySelector('.sb:nth-child(3) .sb-num');
    if (cropStat && d.crop_count) {
      cropStat.innerHTML = `${d.crop_count}<span class="sb-unit">+</span>`;
    }
  } catch (e) {
    console.warn('[Index] Live stats unavailable:', e.message);
  }
});

function setText(sel, text) {
  const el = document.querySelector(sel);
  if (el) el.textContent = text;
}
