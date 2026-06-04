<?php
/**
 * AgroInsight — Bootstrap 

 */

// ── CRITICAL: suppress HTML error output before any other code runs ──────────
ini_set('display_errors', '0');       // never output errors in HTTP body
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');           // still write to php_error_log
error_reporting(E_ALL);              // log everything (just don't display it)

// ── OUTPUT BUFFERING — catch accidental whitespace from included files ────────
if (!ob_get_level()) {
    ob_start();
}

require_once __DIR__ . '/env.php';
loadEnvFile();

// ── SESSION SECURITY ──────────────────────────────────────────────────────────
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.use_strict_mode', '1');
if ($secure) {
    ini_set('session.cookie_secure', '1');
}

if (session_status() === PHP_SESSION_NONE) {
    // FIX: enforce session timeout preference stored by Settings page.
    // PHP's default gc_maxlifetime (usually 24min) was previously always used
    // regardless of the user's saved preference (15/30/60/120/240 min).
    $timeoutMin = (int) ($_COOKIE['session_timeout_min'] ?? 30);
    $allowed    = [15, 30, 60, 120, 240];
    if (!in_array($timeoutMin, $allowed, true)) {
        $timeoutMin = 30;
    }
    ini_set('session.gc_maxlifetime', $timeoutMin * 60);
    session_set_cookie_params(['lifetime' => $timeoutMin * 60]);
    session_start();
}
