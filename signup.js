// ============================================================
// FILE: frontend/js/signup.js
// FIX: File previously only had UI helpers (password strength,
//      plan toggle) with NO actual API call — registration was
//      completely broken. Now wired up to register.php.
// ============================================================

const BASE_URL = 'http://localhost/agroinsight/Backend/api';

// ── UI helpers (unchanged) ─────────────────────────────────
function setPlan(el, type) {
    document.querySelectorAll('.plan-opt').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
}

function checkStrength(val) {
    const segs  = ['s1','s2','s3','s4'].map(id => document.getElementById(id));
    const label = document.getElementById('strengthLabel');
    segs.forEach(s => { s.className = 'sb-seg'; });
    if (!val) { label.textContent = 'Enter a password'; label.style.color = '#3d6e45'; return; }
    let score = 0;
    if (val.length >= 8)         score++;
    if (/[A-Z]/.test(val))       score++;
    if (/[0-9]/.test(val))       score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const levels = ['weak','fair','good','good'];
    const labels = [
        'Weak — too short',
        'Fair — add uppercase or numbers',
        'Good — add symbols for better security',
        'Strong password ✓',
    ];
    const colors = ['#e74c3c','#f39c12','#28a745','#5cd47a'];
    for (let i = 0; i < score; i++) segs[i].classList.add(levels[i]);
    label.textContent = labels[score - 1] || 'Enter a password';
    label.style.color = score > 0 ? colors[score - 1] : '#3d6e45';
}

// ── Form submission ────────────────────────────────────────
function showFormError(msg) {
    let el = document.getElementById('formError');
    if (!el) {
        el = document.createElement('p');
        el.id = 'formError';
        el.style.cssText = 'color:#e74c3c;font-size:13px;margin:8px 0;text-align:center;';
        document.getElementById('signupBtn').before(el);
    }
    el.textContent = msg;
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('signupBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const firstName  = document.getElementById('firstName')?.value.trim()    || '';
        const lastName   = document.getElementById('lastName')?.value.trim()     || '';
        const email      = document.getElementById('signupEmail')?.value.trim()  || '';
        const region     = document.getElementById('region')?.value.trim()       || '';
        const password   = document.getElementById('pwdInput')?.value            || '';
        const confirmPwd = document.getElementById('confirmPwd')?.value          || '';
        const terms      = document.getElementById('terms')?.checked;

        // Client-side validation
        if (!firstName || !lastName) return showFormError('Please enter your full name.');
        if (!email)                  return showFormError('Email address is required.');
        if (password.length < 6)     return showFormError('Password must be at least 6 characters.');
        if (password !== confirmPwd) return showFormError('Passwords do not match.');
        if (!terms)                  return showFormError('Please accept the Terms of Service.');

        const name = `${firstName} ${lastName}`.trim();

        btn.disabled    = true;
        btn.textContent = 'Creating account…';

        try {
            const res  = await fetch(`${BASE_URL}/auth/register.php`, {
                method:      'POST',
                headers:     { 'Content-Type': 'application/json' },
                credentials: 'include',
                body:        JSON.stringify({ name, email, password, region }),
            });
            const data = await res.json();

            if (data.success) {
                window.location.href = 'login.html?registered=1';
            } else {
                showFormError(data.error || 'Registration failed. Please try again.');
                btn.disabled    = false;
                btn.textContent = 'Create My Free Account';
            }
        } catch (err) {
            showFormError('Network error. Check your connection and try again.');
            btn.disabled    = false;
            btn.textContent = 'Create My Free Account';
        }
    });
});
