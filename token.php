<?php
/**
 * GET /api/csrf/token.php

 */

require_once __DIR__ . '/../../config/bootstrap.php';   // starts session
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/csrf.php';

setCORSHeaders();   // handles OPTIONS pre-flight and CORS headers

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

// generateCsrfToken() reads from (or writes to) $_SESSION['csrf_token'].
// Because bootstrap.php has already called session_start(), the session
// cookie is tied to this PHP session — so the token persists across requests.
$token = generateCsrfToken();

sendSuccess(['token' => $token]);