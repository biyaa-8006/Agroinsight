<?php
/**
 * AgroInsight — Register API 
 */

require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/sanitize.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed. Use POST.', 405);
}

try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../helpers/rate_limit.php';

    enforceRateLimit('auth_register', RATE_LIMIT_AUTH, RATE_LIMIT_WINDOW_SECONDS);

    $body   = getRequestBody();
    $name   = sanitizeString($body['name']   ?? '', 100);
    $email  = sanitizeEmail($body['email']   ?? '') ?? '';
    $pass   = $body['password']              ?? '';
    $region = sanitizeString($body['region'] ?? 'Punjab', 100);

    if (!$name || !$email || !$pass) {
        sendError('Name, email, and password are required.');
    }
    if (strlen($pass) < 6) {
        sendError('Password must be at least 6 characters.');
    }

    $db  = getDB();
    $chk = $db->prepare('SELECT id FROM users WHERE email = ?');
    $chk->execute([$email]);
    if ($chk->fetch()) {
        sendError('An account with this email already exists.', 409);
    }

    $hash = password_hash($pass, PASSWORD_BCRYPT);
    $db->prepare(
        'INSERT INTO users (name, email, password, role, region) VALUES (?, ?, ?, ?, ?)'
    )->execute([$name, $email, $hash, 'farmer', $region]);

    sendSuccess(['message' => 'Registration successful. Please log in.'], 201);

} catch (PDOException $e) {
    error_log('[AgroInsight][register] DB error: ' . $e->getMessage());
    sendError(
        defined('APP_ENV') && APP_ENV === 'development'
            ? 'Database error: ' . $e->getMessage()
            : 'A server error occurred. Please try again.',
        500
    );
} catch (Throwable $e) {
    error_log('[AgroInsight][register] Error: ' . $e->getMessage());
    sendError(
        defined('APP_ENV') && APP_ENV === 'development'
            ? 'Server error: ' . $e->getMessage()
            : 'A server error occurred. Please try again.',
        500
    );
}
