<?php
/**
 * AgroInsight — CSRF Helper
 *
 * Token lifecycle:
 *   1. Frontend calls GET /api/csrf/token.php on page load → receives token.
 *   2. Frontend stores token in memory (JS variable), sends it as
 *      X-CSRF-Token header on every POST/PUT/DELETE request.
 *   3. Backend calls validateCsrf() which checks the header against $_SESSION.
 *
 * Why session-based (not double-submit cookie)?
 *   Because you already use PHP sessions for auth. Binding the CSRF token to
 *   the same session is the simplest, most auditable approach.
 */

// ── Token length (bytes → 64 hex chars) ──────────────────────────────────────
define('CSRF_TOKEN_LENGTH', 32);

/**
 * Return the current session CSRF token, generating one if it doesn't exist.
 * Safe to call multiple times; always returns the same token per session.
 */
function generateCsrfToken(): string
{
    // Session must already be started (bootstrap.php handles this).
    if (session_status() !== PHP_SESSION_ACTIVE) {
        // Defensive: should never reach here if bootstrap.php is included first.
        session_start();
    }

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(CSRF_TOKEN_LENGTH));
    }

    return $_SESSION['csrf_token'];
}

/**
 * Rotate the CSRF token (call after login/logout to prevent fixation).
 */
function rotateCsrfToken(): string
{
    $_SESSION['csrf_token'] = bin2hex(random_bytes(CSRF_TOKEN_LENGTH));
    return $_SESSION['csrf_token'];
}

/**
 * Validate the CSRF token sent by the client.
 *
 * Reads from (in priority order):
 *   1. X-CSRF-Token request header  ← preferred for fetch()/AJAX
 *   2. _csrf_token POST body field   ← fallback for HTML forms
 *
 * Calls sendError() and exits on failure — no return value needed.
 */
function validateCsrf(): void
{
    // ── 1. Get the token the client sent ─────────────────────────────────────
    $clientToken = '';

    // Apache / Nginx expose headers via HTTP_* (hyphens become underscores).
    if (!empty($_SERVER['HTTP_X_CSRF_TOKEN'])) {
        $clientToken = $_SERVER['HTTP_X_CSRF_TOKEN'];
    } elseif (!empty($_POST['_csrf_token'])) {
        $clientToken = $_POST['_csrf_token'];
    } else {
        // Also try reading from JSON body (already parsed by getRequestBody()
        // upstream), but that requires the caller to pass it in — so check the
        // raw header first; if absent we'll fail below.
    }

    // ── 2. Get the server-side token ─────────────────────────────────────────
    $serverToken = $_SESSION['csrf_token'] ?? '';

    // ── 3. Constant-time comparison (prevents timing attacks) ────────────────
    if (
        $clientToken === ''
        || $serverToken === ''
        || !hash_equals($serverToken, $clientToken)
    ) {
        // response.php must be loaded before this helper is called.
        sendError('Invalid or missing CSRF token.', 403);
    }
}

/** Alias for validateCsrf() */
function requireCsrf(): void {
    validateCsrf();
}