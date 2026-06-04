<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/csrf.php';
require_once __DIR__ . '/../../helpers/rate_limit.php';
require_once __DIR__ . '/../../helpers/sms_sender.php';

setCORSHeaders();
enforceRateLimit('sms_send', 10, RATE_LIMIT_WINDOW_SECONDS);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}
requireCsrf();

$body    = getRequestBody();
$message = sanitizeString($body['message'] ?? '', 500);
$phone   = sanitizeString($body['phone'] ?? '', 20);
$broadcast = !empty($body['broadcast']);

if (!$message) {
    sendError('Message is required.');
}

$db     = getDB();
$userId = (int) $_SESSION['user_id'];
$isAdmin = ($_SESSION['user_role'] ?? '') === 'admin';
$sent   = 0;
$results = [];

if ($broadcast && $isAdmin) {
    $users = $db->query(
        "SELECT id, name FROM users WHERE role = 'farmer'"
    )->fetchAll();
    foreach ($users as $u) {
        $pref = $db->prepare(
            'SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = ?'
        );
        $pref->execute([(int) $u['id'], 'phone']);
        $p = $pref->fetchColumn();
        $to = $p ?: ('+92300' . str_pad((string) $u['id'], 7, '0', STR_PAD_LEFT));
        $r = sendSmsMessage($db, (int) $u['id'], $to, $message);
        if ($r['ok']) {
            $sent++;
        }
        $results[] = ['user_id' => (int) $u['id'], 'phone' => $to, 'ok' => $r['ok']];
    }
    sendSuccess([
        'sent'    => $sent,
        'total'   => count($users),
        'mock'    => SMS_MOCK_MODE,
        'details' => $results,
    ]);
}

if (!$phone) {
    $pref = $db->prepare(
        'SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = ?'
    );
    $pref->execute([$userId, 'phone']);
    $phone = $pref->fetchColumn() ?: '';
}
if (!$phone) {
    sendError('Phone number required. Add it in Settings.');
}

$r = sendSmsMessage($db, $userId, $phone, $message);
if (!$r['ok']) {
    sendError($r['error'] ?? 'SMS failed', 503);
}

sendSuccess([
    'message' => SMS_MOCK_MODE ? 'SMS queued (demo mode — logged in database).' : 'SMS sent.',
    'status'  => $r['status'],
    'mock'    => $r['mock'] ?? false,
]);
