<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$page    = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(100, max(5, (int) ($_GET['limit'] ?? 20)));
$offset  = ($page - 1) * $perPage;
$userId  = (int) $_SESSION['user_id'];
$isAdmin = ($_SESSION['user_role'] ?? '') === 'admin';

$db = getDB();

if ($isAdmin) {
    $total = (int) $db->query('SELECT COUNT(*) FROM alerts')->fetchColumn();
    $stmt  = $db->prepare(
        'SELECT a.*, c.name AS crop_name, u.name AS user_name
         FROM alerts a
         LEFT JOIN crops c ON a.crop_id = c.id
         LEFT JOIN users u ON a.user_id = u.id
         ORDER BY a.created_at DESC
         LIMIT ? OFFSET ?'
    );
    $stmt->execute([$perPage, $offset]);
} else {
    $countStmt = $db->prepare('SELECT COUNT(*) FROM alerts WHERE user_id = ?');
    $countStmt->execute([$userId]);
    $total = (int) $countStmt->fetchColumn();
    $stmt  = $db->prepare(
        'SELECT a.*, c.name AS crop_name
         FROM alerts a
         LEFT JOIN crops c ON a.crop_id = c.id
         WHERE a.user_id = ?
         ORDER BY a.created_at DESC
         LIMIT ? OFFSET ?'
    );
    $stmt->execute([$userId, $perPage, $offset]);
}

$alerts = $stmt->fetchAll();

sendSuccess([
    'alerts'     => $alerts,
    'pagination' => [
        'total'       => $total,
        'page'        => $page,
        'per_page'    => $perPage,
        'total_pages' => (int) ceil($total / max(1, $perPage)),
    ],
]);
