<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/admin_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/csrf.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}
requireCsrf();

$body     = getRequestBody();
$name     = sanitizeString($body['name'] ?? '', 100);
$email    = sanitizeEmail($body['email'] ?? '') ?? '';
$password = $body['password'] ?? '';
$role     = sanitizeEnum($body['role'] ?? 'farmer', ['admin', 'farmer'], 'farmer');
$region   = sanitizeString($body['region'] ?? 'Punjab', 100);

if (!$name || !$email || strlen($password) < 6) {
    sendError('Name, valid email, and password (min 6 chars) are required.');
}

$db   = getDB();
$hash = password_hash($password, PASSWORD_BCRYPT);

try {
    $db->prepare(
        'INSERT INTO users (name, email, password, role, region) VALUES (?, ?, ?, ?, ?)'
    )->execute([$name, $email, $hash, $role, $region]);
} catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'Duplicate')) {
        sendError('Email already registered.', 409);
    }
    throw $e;
}

sendSuccess(['id' => (int) $db->lastInsertId(), 'message' => 'User created.'], 201);
