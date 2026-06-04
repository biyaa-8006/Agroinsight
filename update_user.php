<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/admin_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/csrf.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}
requireCsrf();

$body   = getRequestBody();
$userId = sanitizeInt($body['id'] ?? 0, 1, 999999);
if (!$userId) {
    sendError('Valid user id required.');
}

$db  = getDB();
$chk = $db->prepare('SELECT id FROM users WHERE id = ?');
$chk->execute([$userId]);
if (!$chk->fetch()) {
    sendError('User not found.', 404);
}

$fields = [];
$params = [];

if (isset($body['name'])) {
    $fields[] = 'name = ?';
    $params[] = sanitizeString($body['name'], 100);
}
if (isset($body['email'])) {
    $email = sanitizeEmail($body['email']) ?? '';
    if (!$email) {
        sendError('Invalid email.');
    }
    $fields[] = 'email = ?';
    $params[] = $email;
}
if (isset($body['role'])) {
    $fields[] = 'role = ?';
    $params[] = sanitizeEnum($body['role'], ['admin', 'farmer'], 'farmer');
}
if (isset($body['region'])) {
    $fields[] = 'region = ?';
    $params[] = sanitizeString($body['region'], 100);
}
if (!empty($body['password'])) {
    if (strlen($body['password']) < 6) {
        sendError('Password must be at least 6 characters.');
    }
    $fields[] = 'password = ?';
    $params[] = password_hash($body['password'], PASSWORD_BCRYPT);
}

if (!$fields) {
    sendError('No fields to update.');
}

$params[] = $userId;
$db->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

sendSuccess(['message' => 'User updated.']);
