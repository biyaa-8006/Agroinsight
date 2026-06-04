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

$city    = sanitizeCity(trim($_GET['city'] ?? ''));
$page    = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(200, max(5, (int) ($_GET['limit'] ?? 40)));
$offset  = ($page - 1) * $perPage;

$db = getDB();
$where = 'user_id = ?';
$params = [(int) $_SESSION['user_id']];

if ($city) {
    $where .= ' AND location LIKE ?';
    $params[] = '%' . $city . '%';
}

$countStmt = $db->prepare("SELECT COUNT(*) FROM weather_logs WHERE $where");
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();

$sql = "SELECT id, location, temperature, humidity, rainfall, wind_speed,
               condition_text, recorded_at
        FROM weather_logs WHERE $where
        ORDER BY recorded_at DESC LIMIT $perPage OFFSET $offset";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = array_reverse($stmt->fetchAll());

sendSuccess([
    'records'    => $rows,
    'count'      => count($rows),
    'pagination' => [
        'total'       => $total,
        'page'        => $page,
        'per_page'    => $perPage,
        'total_pages' => (int) ceil($total / max(1, $perPage)),
    ],
]);
