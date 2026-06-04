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

$body = getRequestBody();

$crop_id    = (!empty($body['crop_id'])) ? sanitizeInt($body['crop_id'], 1, 1000) : null;
$alert_type = sanitizeEnum(
    trim($body['alert_type'] ?? ''),
    ['weather', 'crop', 'pest', 'frost', 'flood', 'drought', 'heat', 'general'],
    ''
);
$message  = sanitizeString($body['message'] ?? '', 500);
$severity = sanitizeEnum(
    trim($body['severity'] ?? 'low'),
    ['low', 'medium', 'high', 'critical'],
    'low'
);

if (!$alert_type) {
    sendError('Invalid alert_type.');
}
if (!$message) {
    sendError('Message is required.');
}

$db = getDB();
if ($crop_id) {
    $chk = $db->prepare('SELECT id FROM crops WHERE id = ?');
    $chk->execute([$crop_id]);
    if (!$chk->fetch()) {
        sendError('Crop not found.', 404);
    }
}

$isAdmin    = ($_SESSION['user_role'] ?? '') === 'admin';
$targetUser = sanitizeInt($body['user_id'] ?? 0, 0, 999999);
$broadcast  = !empty($body['broadcast']) && $isAdmin;

if ($broadcast) {
    $farmers = $db->query("SELECT id FROM users WHERE role = 'farmer'")->fetchAll();
    $ins = $db->prepare(
        'INSERT INTO alerts (user_id, crop_id, alert_type, message, severity) VALUES (?, ?, ?, ?, ?)'
    );
    $ids = [];
    foreach ($farmers as $f) {
        $ins->execute([(int) $f['id'], $crop_id, $alert_type, $message, $severity]);
        $ids[] = (int) $db->lastInsertId();
    }
    sendSuccess(['message' => 'Broadcast sent.', 'count' => count($ids)], 201);
}

$uid = ($isAdmin && $targetUser) ? $targetUser : (int) $_SESSION['user_id'];

$db->prepare(
    'INSERT INTO alerts (user_id, crop_id, alert_type, message, severity) VALUES (?, ?, ?, ?, ?)'
)->execute([$uid, $crop_id, $alert_type, $message, $severity]);

require_once __DIR__ . '/../../helpers/alert_notify.php';
notifyUserIfSmsEnabled($db, $uid, $message);

sendSuccess(['message' => 'Alert created.', 'id' => (int) $db->lastInsertId()], 201);
