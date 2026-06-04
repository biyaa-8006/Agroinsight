<?php
/**
 * GET /api/user/get_profile.php
 * Returns the authenticated user's profile and preferences.
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$db   = getDB();
$uid  = (int) $_SESSION['user_id'];

$stmt = $db->prepare(
    'SELECT id, name, email, role, region, created_at FROM users WHERE id = ?'
);
$stmt->execute([$uid]);
$user = $stmt->fetch();

if (!$user) {
    sendError('User not found.', 404);
}

// Load preferences from user_preferences table (created lazily)
$prefStmt = $db->prepare(
    'SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?'
);
$prefStmt->execute([$uid]);
$rows  = $prefStmt->fetchAll();
$prefs = [];
foreach ($rows as $r) {
    $prefs[$r['pref_key']] = $r['pref_value'];
}

// Merge defaults
$defaults = [
    'default_city'        => $user['region'] ?: 'Faisalabad',
    'default_crop_id'     => '1',
    'alert_email'         => '1',
    'alert_sms'           => '0',
    'alert_flood'         => '1',
    'alert_drought'       => '1',
    'alert_heat'          => '1',
    'alert_pest'          => '1',
    'theme'               => 'dark',
    'language'            => 'en',
    'data_privacy'        => '1',
    'session_timeout_min' => '60',
];
foreach ($defaults as $k => $v) {
    if (!isset($prefs[$k])) {
        $prefs[$k] = $v;
    }
}

sendSuccess([
    'user'  => $user,
    'prefs' => $prefs,
]);
