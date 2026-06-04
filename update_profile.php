<?php
/**
 * POST /api/user/update_profile.php
 * Updates profile fields and/or preferences for the authenticated user.
 *
 * Accepted body (all optional):
 *   name, region                       — profile fields
 *   current_password, new_password     — password change (both required together)
 *   prefs: { key: value, ... }         — arbitrary preference keys
 *
 * Responses:
 *   200 { success:true, data:{ updated: [...] } }
 *   400 { success:false, error:"..." }
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
$db   = getDB();
$uid  = (int) $_SESSION['user_id'];

// Load current user
$stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([$uid]);
$user = $stmt->fetch();
if (!$user) {
    sendError('User not found.', 404);
}

$updated = [];

// ── 1. Profile fields ─────────────────────────────────────────
$name   = isset($body['name'])   ? sanitizeString($body['name'],   100) : null;
$region = isset($body['region']) ? sanitizeString($body['region'], 100) : null;

$profileChanges = [];
if ($name !== null && $name !== '' && $name !== $user['name']) {
    $profileChanges['name'] = $name;
}
if ($region !== null && $region !== $user['region']) {
    $profileChanges['region'] = $region;
}
if ($profileChanges) {
    $sets   = implode(', ', array_map(fn($k) => "$k = ?", array_keys($profileChanges)));
    $values = array_values($profileChanges);
    $values[] = $uid;
    $db->prepare("UPDATE users SET $sets WHERE id = ?")->execute($values);
    $updated[] = 'profile';
    // Update session name if name changed
    if (isset($profileChanges['name'])) {
        $_SESSION['user_name'] = $profileChanges['name'];
    }
}

// ── 2. Password change ────────────────────────────────────────
$currentPwd = $body['current_password'] ?? '';
$newPwd     = $body['new_password']     ?? '';

if ($currentPwd !== '' || $newPwd !== '') {
    if ($currentPwd === '' || $newPwd === '') {
        sendError('Both current_password and new_password are required to change your password.');
    }
    if (!password_verify($currentPwd, $user['password'])) {
        sendError('Current password is incorrect.', 401);
    }
    if (strlen($newPwd) < 6) {
        sendError('New password must be at least 6 characters.');
    }
    $hash = password_hash($newPwd, PASSWORD_BCRYPT);
    $db->prepare('UPDATE users SET password = ? WHERE id = ?')->execute([$hash, $uid]);
    $updated[] = 'password';
}

// ── 3. Preferences ────────────────────────────────────────────
// Create table if not exists (lazy migration — safe to run multiple times)
$db->exec(
    'CREATE TABLE IF NOT EXISTS user_preferences (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT NOT NULL,
        pref_key   VARCHAR(60) NOT NULL,
        pref_value VARCHAR(255) NOT NULL DEFAULT \'\',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_pref (user_id, pref_key),
        CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
);

$allowedPrefKeys = [
    'default_city', 'default_crop_id',
    'alert_email', 'alert_sms',
    'alert_flood', 'alert_drought', 'alert_heat', 'alert_pest',
    'theme', 'language', 'data_privacy', 'session_timeout_min',
];

$prefs = $body['prefs'] ?? [];
if (is_array($prefs) && !empty($prefs)) {
    $upsert = $db->prepare(
        'INSERT INTO user_preferences (user_id, pref_key, pref_value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE pref_value = VALUES(pref_value)'
    );
    foreach ($prefs as $k => $v) {
        if (!in_array($k, $allowedPrefKeys, true)) {
            continue; // silently skip unknown keys
        }
        $upsert->execute([$uid, $k, sanitizeString((string) $v, 255)]);
    }
    $updated[] = 'preferences';
}

if (empty($updated)) {
    sendError('No changes detected — nothing was updated.');
}

sendSuccess(['updated' => $updated]);
