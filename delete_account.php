<?php
/**
 * POST /api/user/delete_account.php
 * Permanently deletes the authenticated user account and all related data.
 * Requires CSRF token. No body needed (user is identified by session).
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/csrf.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}

validateCsrf();

$uid = (int) $_SESSION['user_id'];
$db  = getDB();

// Prevent admin self-delete
$roleStmt = $db->prepare('SELECT role FROM users WHERE id = ?');
$roleStmt->execute([$uid]);
$row = $roleStmt->fetch();
if (!$row) {
    sendError('User not found.', 404);
}
if ($row['role'] === 'admin') {
    sendError('Admin accounts cannot be self-deleted. Contact the system administrator.', 403);
}

// Delete related data first (FK constraints)
$db->prepare('DELETE FROM weather_logs WHERE user_id = ?')->execute([$uid]);
$db->prepare('DELETE FROM predictions   WHERE user_id = ?')->execute([$uid]);
$db->prepare('DELETE FROM alerts        WHERE user_id = ?')->execute([$uid]);
// user_preferences deletes via ON DELETE CASCADE on the FK
$db->prepare('DELETE FROM users         WHERE id      = ?')->execute([$uid]);

// Destroy session
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();

sendSuccess(['message' => 'Account permanently deleted.']);
