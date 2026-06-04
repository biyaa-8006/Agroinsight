// ============================================================
// FILE: frontend/js/chatbot.js
// ============================================================

const BASE_URL = 'http://localhost/agroinsight/Backend/api';

// ── State ──────────────────────────────────────────────────────
let history     = [];
let sidebarOpen = true;
let isTyping    = false;
let csrfToken   = '';          // ← populated by initCsrf() below

// ── DOM refs ───────────────────────────────────────────────────
const msgWrap  = document.getElementById('messagesWrap');
const msgInput = document.getElementById('msgInput');
const sendBtn  = document.getElementById('sendBtn');
const welcome  = document.getElementById('welcomeScreen');

// ── CSRF bootstrap ─────────────────────────────────────────────
/**
 * Fetch a CSRF token from the server and cache it.
 * Called once on page load. Uses credentials:include so the session
 * cookie is sent — the token returned is tied to that session.
 */
async function initCsrf() {
    try {
        const res  = await fetch(`${BASE_URL}/csrf/token.php`, {
            method:      'GET',
            credentials: 'include',
        });
        const data = await res.json();
        if (data.success && data.data?.token) {
            csrfToken = data.data.token;
        } else {
            console.error('[CSRF] Token fetch returned unexpected payload:', data);
        }
    } catch (err) {
        console.error('[CSRF] Failed to fetch CSRF token:', err.message);
        // The user will see the error when they try to send their first message.
    }
}

// ── Send ───────────────────────────────────────────────────────
async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text || isTyping) return;

    // Guard: if CSRF token is missing, refuse to send and explain why.
    if (!csrfToken) {
        addMessage('bot', '⚠️ **Security token missing.** Please refresh the page and try again.', true);
        return;
    }

    if (welcome) welcome.style.display = 'none';

    addMessage('user', text);

    // Keep last 20 turns for context (Gemini role format).
    const contextHistory = history.slice(-20).map(m => ({
        role:  m.role === 'bot' ? 'model' : 'user',
        parts: [{ text: m.content }],
    }));

    history.push({ role: 'user', content: text });
    msgInput.value = '';
    autoResize(msgInput);
    sendBtn.disabled = true;
    isTyping = true;

    const typingId = showTyping();

    try {
        const res  = await fetch(`${BASE_URL}/chatbot/chat.php`, {
            method:      'POST',
            credentials: 'include',            // send session cookie
            headers: {
                'Content-Type':  'application/json',
                'X-CSRF-Token':  csrfToken,    // ← THE FIX: attach token every POST
            },
            body: JSON.stringify({ message: text, history: contextHistory }),
        });

        const data = await res.json();
        removeTyping(typingId);

        if (data.success) {
            addMessage('bot', data.data.reply);
            history.push({ role: 'bot', content: data.data.reply });
        } else {
            // If the server rotated the session (e.g. after re-login) the token
            // may be stale. Re-fetch automatically once and retry.
            if (res.status === 403 && data.error?.toLowerCase().includes('csrf')) {
                addMessage('bot', '🔄 Session refreshed — please send your message again.', true);
                await initCsrf();   // silently rotate the cached token
            } else {
                addMessage('bot', `⚠️ **Error:** ${data.error}`, true);
            }
        }
    } catch (err) {
        removeTyping(typingId);
        addMessage('bot', `⚠️ **Network error:** ${err.message}`, true);
    }

    isTyping         = false;
    sendBtn.disabled = false;
    scrollBottom();
}

// ── Add Message ────────────────────────────────────────────────
function addMessage(role, text, isError = false) {
    const row  = document.createElement('div');
    row.className = `msg-row ${role}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const avatarHTML    = role === 'bot'
        ? `<div class="msg-avatar bot-av">🤖</div>`
        : `<div class="msg-avatar user-av">U</div>`;
    const bubbleContent = role === 'bot' ? renderMarkdown(text) : escHtml(text);
    const bubbleClass   = role === 'bot' ? 'bot' : 'user';

    row.innerHTML = `
        ${avatarHTML}
        <div class="bubble-wrap">
            <div class="bubble ${bubbleClass}${isError ? ' error' : ''}">
                ${role === 'bot'
                    ? `<button class="copy-btn" onclick="copyMsg(this)"><i class="fa fa-copy"></i> copy</button>`
                    : ''}
                <div class="bubble-content">${bubbleContent}</div>
            </div>
            <div class="msg-time">${role === 'bot' ? 'AgriAI · ' : 'You · '}${time}</div>
        </div>`;

    msgWrap.appendChild(row);
    scrollBottom();
}

// ── Markdown renderer ──────────────────────────────────────────
function renderMarkdown(text) {
    let t = escHtml(text);
    t = t.replace(/```([a-z]*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code.trim()}</code></pre>`);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    t = t.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    t = t.replace(/^&gt; (.+)$/gm, '<div class="highlight">$1</div>');
    t = t.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    t = t.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    t = t.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    t = t.split(/\n{2,}/).map(para => {
        if (/^<(h[34]|ul|ol|pre|div)/.test(para.trim())) return para;
        const lines = para.split('\n').filter(l => l.trim()).join('<br>');
        return lines ? `<p>${lines}</p>` : '';
    }).join('');
    return t;
}

function escHtml(t) {
    return t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Typing indicator ───────────────────────────────────────────
function showTyping() {
    const id  = 'typing-' + Date.now();
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.id = id;
    row.innerHTML = `
        <div class="msg-avatar bot-av">🤖</div>
        <div class="bubble-wrap">
            <div class="typing-bubble">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <div class="msg-time" style="font-size:9px;color:#374151;">AgriAI is thinking…</div>
        </div>`;
    msgWrap.appendChild(row);
    scrollBottom();
    return id;
}

function removeTyping(id) {
    document.getElementById(id)?.remove();
}

// ── Utils ──────────────────────────────────────────────────────
function scrollBottom() {
    setTimeout(() => msgWrap.scrollTo({ top: msgWrap.scrollHeight, behavior: 'smooth' }), 50);
}

function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function usePrompt(q) {
    msgInput.value = q;
    autoResize(msgInput);
    sendMessage();
}

function copyMsg(btn) {
    const text = btn.closest('.bubble').querySelector('.bubble-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = '<i class="fa fa-check"></i> copied';
        setTimeout(() => btn.innerHTML = '<i class="fa fa-copy"></i> copy', 1800);
    });
}

function clearChat() {
    history = [];
    msgWrap.querySelectorAll('.msg-row').forEach(m => m.remove());
    if (welcome) welcome.style.display = 'flex';
}

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
}

function exportChat() {
    if (!history.length) return;
    const text = history.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n---\n\n');
    const blob  = new Blob([text], { type: 'text/plain' });
    const a     = document.createElement('a');
    a.href      = URL.createObjectURL(blob);
    a.download  = `agriweather-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
}

// ── Input state ────────────────────────────────────────────────
msgInput.addEventListener('input', () => {
    sendBtn.disabled = msgInput.value.trim().length === 0;
});
sendBtn.disabled = false;

// ── Initialise CSRF on page load ───────────────────────────────
// This must run before any sendMessage() call.
initCsrf();