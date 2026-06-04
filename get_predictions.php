<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$page    = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(50, max(5, (int) ($_GET['limit'] ?? 15)));
$offset  = ($page - 1) * $perPage;
$cropId  = sanitizeInt($_GET['crop_id'] ?? 0, 0, 1000);

$db = getDB();
$isAdmin = ($_SESSION['user_role'] ?? '') === 'admin';

$where = $isAdmin ? '1=1' : 'p.user_id = ?';
$params = $isAdmin ? [] : [(int) $_SESSION['user_id']];

if ($cropId) {
    $where .= ' AND p.crop_id = ?';
    $params[] = $cropId;
}

$countSql = "SELECT COUNT(*) FROM predictions p WHERE $where";
$countStmt = $db->prepare($countSql);
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

$sql = "SELECT p.*, c.name AS crop_name
        FROM predictions p
        LEFT JOIN crops c ON c.id = p.crop_id
        WHERE $where
        ORDER BY p.predicted_at DESC
        LIMIT $perPage OFFSET $offset";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

sendSuccess([
    'predictions' => $rows,
    'pagination'  => [
        'total'       => $total,
        'page'        => $page,
        'per_page'    => $perPage,
        'total_pages' => (int) ceil($total / max(1, $perPage)),
    ],
]);
