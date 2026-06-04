<?php
/**
 * POST /api/user/clear_data.php
 * Clears weather_logs or predictions for the authenticated user.
 * Body: { type: "weather_logs" | "predictions" }
 */
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

validateCsrf();

$body = getRequestBody();
$type = sanitizeEnum($body['type'] ?? '', ['weather_logs', 'predictions'], '');
if (!$type) {
    sendError('type must be "weather_logs" or "predictions".');
}

$uid = (int) $_SESSION['user_id'];
$db  = getDB();

if ($type === 'weather_logs') {
    $stmt = $db->prepare('DELETE FROM weather_logs WHERE user_id = ?');
} else {
    $stmt = $db->prepare('DELETE FROM predictions WHERE user_id = ?');
}
$stmt->execute([$uid]);
$deleted = $stmt->rowCount();

sendSuccess(['type' => $type, 'rows_deleted' => $deleted]);
