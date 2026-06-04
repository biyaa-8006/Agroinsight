<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/admin_check.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$db = getDB();

$totalUsers = (int) $db->query('SELECT COUNT(*) FROM users')->fetchColumn();
$totalCrops = (int) $db->query('SELECT COUNT(*) FROM crops')->fetchColumn();

$predRow = $db->query(
    "SELECT COUNT(*) AS total,
            SUM(risk_level = 'high')   AS high,
            SUM(risk_level = 'medium') AS medium,
            SUM(risk_level = 'low')    AS low
     FROM predictions"
)->fetch();

$alertRow = $db->query(
    "SELECT COUNT(*) AS total,
            SUM(severity = 'critical') AS critical,
            SUM(severity = 'high')     AS high
     FROM alerts"
)->fetch();

$recentLogs = (int) $db->query(
    "SELECT COUNT(*) FROM weather_logs WHERE recorded_at >= NOW() - INTERVAL 7 DAY"
)->fetchColumn();

$newUsers = $db->query(
    'SELECT id, name, email, region, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
)->fetchAll();

sendSuccess([
    'users'           => $totalUsers,
    'crops'           => $totalCrops,
    'predictions'     => [
        'total'  => (int) $predRow['total'],
        'high'   => (int) $predRow['high'],
        'medium' => (int) $predRow['medium'],
        'low'    => (int) $predRow['low'],
    ],
    'alerts'          => [
        'total'    => (int) $alertRow['total'],
        'critical' => (int) $alertRow['critical'],
        'high'     => (int) $alertRow['high'],
    ],
    'weather_logs_7d' => $recentLogs,
    'newest_users'    => $newUsers,
]);
