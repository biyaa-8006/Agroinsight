'use strict';

// ── HTML ESCAPE HELPER (prevents Stored XSS) ─────────────────────────────────
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof requireAdminPage === 'function' && !requireAdminPage()) return;

  document.querySelectorAll('.tab-btns button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btns button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('btnCreateUser')?.addEventListener('click', createUser);
  document.getElementById('btnSaveConfig')?.addEventListener('click', saveConfig);

  loadStats();
  loadUsers();
  loadCrops();
  loadConfig();
  loadMessages();
});

function msg(text, ok = true) {
  const el = document.getElementById('adminMsg');
  if (el) {
    el.style.color = ok ? '#86efac' : '#fca5a5';
    el.textContent = text;
  }
}

async function loadStats() {
  try {
    const s = await adminGetStats();
    const grid = document.getElementById('statsGrid');
    if (grid) {
      // Numbers only from trusted API — safe to interpolate
      grid.innerHTML = `
        <div class="stat-card"><h3>${esc(s.users)}</h3><p>Users</p></div>
        <div class="stat-card"><h3>${esc(s.crops)}</h3><p>Crops</p></div>
        <div class="stat-card"><h3>${esc(s.predictions?.total ?? 0)}</h3><p>Predictions</p></div>
        <div class="stat-card"><h3>${esc(s.alerts?.total ?? 0)}</h3><p>Alerts</p></div>
        <div class="stat-card"><h3>${esc(s.weather_logs_7d ?? 0)}</h3><p>Weather logs (7d)</p></div>
      `;
    }
    const nu = document.getElementById('newUsersList');
    if (nu && s.newest_users) {
      // FIX: escape all user-supplied fields — prevents stored XSS
      nu.innerHTML = '<table><tr><th>Name</th><th>Email</th><th>Role</th></tr>' +
        s.newest_users.map((u) =>
          `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td></tr>`
        ).join('') +
        '</table>';
    }
  } catch (e) {
    msg(e.message, false);
  }
}

async function loadUsers() {
  try {
    const data = await adminGetUsers(1, 50);
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;
    // FIX: escape all user-supplied fields — prevents stored XSS
    tbody.innerHTML = data.users.map((u) => `
      <tr>
        <td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${esc(u.region || '—')}</td>
        <td>
          <button class="btn-sm btn-del" data-del-user="${esc(u.id)}">Delete</button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-del-user]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this user?')) return;
        await adminDeleteUser(parseInt(btn.dataset.delUser, 10));
        msg('User deleted.');
        loadUsers();
        loadStats();
      });
    });
  } catch (e) {
    msg(e.message, false);
  }
}

async function createUser() {
  try {
    await adminCreateUser({
      name: document.getElementById('newName').value,
      email: document.getElementById('newEmail').value,
      password: document.getElementById('newPass').value,
      role: document.getElementById('newRole').value,
      region: document.getElementById('newRegion').value,
    });
    msg('User created.');
    loadUsers();
    loadStats();
  } catch (e) {
    msg(e.message, false);
  }
}

async function loadCrops() {
  try {
    const crops = await adminGetCrops();
    const list = Array.isArray(crops) ? crops : (crops.crops || []);
    const tbody = document.getElementById('cropsTable');
    if (!tbody) return;
    // FIX: escape crop data — prevents stored XSS
    tbody.innerHTML = list.map((c) => `
      <tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.min_temp)}–${esc(c.max_temp)}°C</td>
        <td>${esc(c.growing_season || '—')}</td>
        <td><button class="btn-sm btn-edit" data-edit-crop="${esc(c.id)}">Edit season</button></td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit-crop]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const season = prompt('Growing season:', 'Oct-Mar');
        if (!season) return;
        await adminUpdateCrop({ id: parseInt(btn.dataset.editCrop, 10), growing_season: season });
        msg('Crop updated.');
        loadCrops();
      });
    });
  } catch (e) {
    msg(e.message, false);
  }
}

async function loadConfig() {
  try {
    const data = await adminGetConfig();
    const cfg = data.config || {};
    const form = document.getElementById('configForm');
    if (!form) return;
    // FIX: escape config keys and values — prevents stored XSS
    form.innerHTML = Object.keys(cfg).map((k) => `
      <label style="font-size:11px;color:#9ca3af;">${esc(k)}</label>
      <input data-cfg-key="${esc(k)}" value="${esc(cfg[k])}">
    `).join('');
  } catch (e) {
    msg('Run database/schema_updates.sql for config table.', false);
  }
}

async function loadMessages() {
  try {
    const data = await apiGet('/admin/get_messages.php');
    const tbody = document.getElementById('messagesTable');
    if (!tbody) return;
    const list = data.messages || [];
    // FIX: escape all message fields (name, email, subject, message) — prevents stored XSS
    tbody.innerHTML = list.map((m) => `
      <tr>
        <td>${esc(m.created_at || '')}</td>
        <td>${esc(m.name)}</td>
        <td>${esc(m.email)}</td>
        <td>${esc(m.subject)}</td>
        <td style="max-width:280px;">${esc(m.message)}</td>
      </tr>`).join('') || '<tr><td colspan="5">No messages</td></tr>';
  } catch (e) {
    msg(e.message, false);
  }
}

async function saveConfig() {
  const config = {};
  document.querySelectorAll('#configForm input[data-cfg-key]').forEach((inp) => {
    config[inp.dataset.cfgKey] = inp.value;
  });
  try {
    await adminUpdateConfig(config);
    msg('Configuration saved.');
  } catch (e) {
    msg(e.message, false);
  }
}
