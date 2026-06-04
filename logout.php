<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/csrf.php';

setCORSHeaders();

// FIX: require POST + CSRF validation to prevent silent logout via <img> tags
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}

validateCsrf();

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();

sendSuccess(['message' => 'Logged out']);
