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

$userId = sanitizeInt(getRequestBody()['id'] ?? 0, 1, 999999);
if (!$userId) {
    sendError('Valid user id required.');
}
if ($userId === (int) $_SESSION['user_id']) {
    sendError('Cannot delete your own admin account.', 403);
}

$db = getDB();
$stmt = $db->prepare('DELETE FROM users WHERE id = ?');
$stmt->execute([$userId]);
if ($stmt->rowCount() === 0) {
    sendError('User not found.', 404);
}

sendSuccess(['message' => 'User deleted.']);
