<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/csrf.php';
require_once __DIR__ . '/../../helpers/sms_sender.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}

requireCsrf();

$body = getRequestBody();
$phone = sanitizeString($body['phone'] ?? '', 20);
$message = sanitizeString($body['message'] ?? '', 500);
$userId = (int) $_SESSION['user_id'];

if (!$phone) {
    sendError('Phone number is required.');
}

if (!$message) {
    sendError('Message is required.');
}

$db = getDB();

// Call the existing helper function from sms_sender.php
$result = sendSmsMessage($db, $userId, $phone, $message);

if ($result['ok']) {
    sendSuccess([
        'sent' => true,
        'mock' => $result['mock'] ?? false,
        'status' => $result['status'],
        'message' => $result['mock'] ? 'SMS logged (demo mode)' : 'SMS sent successfully'
    ]);
} else {
    sendError($result['error'] ?? 'Failed to send SMS', 500);
}