<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/csrf.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}
requireCsrf();

$body    = getRequestBody();
$alertId = sanitizeInt($body['id'] ?? 0, 1, 999999999);
$markAll = !empty($body['all']);

$db     = getDB();
$userId = (int) $_SESSION['user_id'];
$isAdmin = ($_SESSION['user_role'] ?? '') === 'admin';

if ($markAll) {
    if ($isAdmin) {
        $db->exec('UPDATE alerts SET is_read = 1 WHERE is_read = 0');
    } else {
        $stmt = $db->prepare('UPDATE alerts SET is_read = 1 WHERE user_id = ?');
        $stmt->execute([$userId]);
    }
    sendSuccess(['message' => 'All alerts marked read.']);
}

if (!$alertId) {
    sendError('Alert id required.');
}

if ($isAdmin) {
    $stmt = $db->prepare('UPDATE alerts SET is_read = 1 WHERE id = ?');
    $stmt->execute([$alertId]);
} else {
    $stmt = $db->prepare('UPDATE alerts SET is_read = 1 WHERE id = ? AND user_id = ?');
    $stmt->execute([$alertId, $userId]);
}

if ($stmt->rowCount() === 0) {
    sendError('Alert not found.', 404);
}

sendSuccess(['message' => 'Alert marked read.']);
