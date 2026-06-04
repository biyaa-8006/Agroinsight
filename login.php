<?php
/**
 * AgroInsight — Login API  

 */

require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/sanitize.php';

// ── CORS must be first — so even error responses have correct headers ─────────
setCORSHeaders();

// ── Method guard ──────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', 405);
}

// ── Wrap everything in try-catch so NO exception escapes as HTML ──────────────
try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../helpers/rate_limit.php';

    // Rate limiting (uses DB — inside try so DB errors return JSON)
    enforceRateLimit('auth_login', RATE_LIMIT_AUTH, RATE_LIMIT_WINDOW_SECONDS);

    // Parse & validate input
    $body  = getRequestBody();
    $email = sanitizeEmail($body['email'] ?? '') ?? '';
    $pass  = $body['password'] ?? '';

    if (!$email || !$pass) {
        sendError('Email and password are required.');
    }

    // Look up user
    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password'])) {
        sendError(
            'Invalid username or password. Please contact the system administrator to create or recover your account.',
            401
        );
    }

    // Regenerate session to prevent fixation attacks
    session_regenerate_id(true);
    $_SESSION['user_id']    = $user['id'];
    $_SESSION['user_name']  = $user['name'];
    $_SESSION['user_role']  = $user['role'];
    $_SESSION['user_email'] = $user['email'];

    sendSuccess([
        'id'     => (int) $user['id'],
        'name'   => $user['name'],
        'email'  => $user['email'],
        'role'   => $user['role'],
        'region' => $user['region'] ?? '',
    ]);

} catch (PDOException $e) {
    // Database error — return JSON, never HTML
    error_log('[AgroInsight][login] DB error: ' . $e->getMessage());
    sendError(
        defined('APP_ENV') && APP_ENV === 'development'
            ? 'Database error: ' . $e->getMessage()
            : 'A server error occurred. Please try again.',
        500
    );
} catch (Throwable $e) {
    // Any other PHP error (function not found, syntax, etc.) — return JSON
    error_log('[AgroInsight][login] Unexpected error: ' . $e->getMessage());
    sendError(
        defined('APP_ENV') && APP_ENV === 'development'
            ? 'Server error: ' . $e->getMessage()
            : 'A server error occurred. Please try again.',
        500
    );
}
