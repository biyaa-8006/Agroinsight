<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/rate_limit.php';

require_once __DIR__ . '/../../helpers/csrf.php';
setCORSHeaders();
if ($_SERVER['REQUEST_METHOD'] === 'POST') { validateCsrf(); }
enforceRateLimit('contact', 5, 300);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}

$body    = getRequestBody();
$name    = sanitizeString($body['name'] ?? '', 100);
$email   = sanitizeEmail($body['email'] ?? '') ?? '';
$subject = sanitizeString($body['subject'] ?? '', 200);
$message = sanitizeString($body['message'] ?? '', 2000);

if (!$name || !$email || !$subject || !$message) {
    sendError('All fields are required.');
}

$db = getDB();
$db->prepare(
    'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
)->execute([$name, $email, $subject, $message]);

sendSuccess(['message' => 'Thank you — we received your message.'], 201);
