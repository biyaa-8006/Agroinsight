<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/admin_check.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$page    = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(50, max(5, (int) ($_GET['limit'] ?? 20)));
$offset  = ($page - 1) * $perPage;

$db    = getDB();
$total = (int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn();

$stmt = $db->prepare(
    'SELECT id, name, email, role, region, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
);
$stmt->execute([$perPage, $offset]);
$users = $stmt->fetchAll();

foreach ($users as &$u) {
    $u['id'] = (int) $u['id'];
}

sendSuccess([
    'users'       => $users,
    'total'       => $total,
    'page'        => $page,
    'per_page'    => $perPage,
    'total_pages' => (int) ceil($total / max(1, $perPage)),
]);
