/**
 * Protect authenticated pages — redirect to login if no session.
 */
(function () {
  const PUBLIC = /\/(login|signup|Index|index|features|About|about|Contact|contact)\.html$/i;
  const path = window.location.pathname;

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  if (PUBLIC.test(path)) return;

  if (/\/admin\//i.test(path)) {
    if (!user || user.role !== 'admin') {
      window.location.href = '../login.html';
    }
    return;
  }

  if (!user || !user.id) {
    const next = encodeURIComponent(path.split('/').pop() || 'Weather.html');
    window.location.href = 'login.html?redirect=' + next;
    return;
  }

  document.querySelectorAll('[data-admin-only]').forEach((el) => {
    el.style.display = user.role === 'admin' ? '' : 'none';
  });

  const adminLink = document.getElementById('adminNavLink');
  if (adminLink && user.role === 'admin') {
    adminLink.style.display = '';
  }
})();
