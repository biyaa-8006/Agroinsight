<?php
/**
 * GET ?city=Faisalabad&limit=30 — trend analysis via weather_analysis.py
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/rate_limit.php';
require_once __DIR__ . '/../../helpers/python_runner.php';

setCORSHeaders();
enforceRateLimit('weather_history_analysis', RATE_LIMIT_WEATHER, RATE_LIMIT_WINDOW_SECONDS);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$city  = sanitizeCity(trim($_GET['city'] ?? ''));
$limit = min(100, max(5, (int) ($_GET['limit'] ?? 30)));

$db = getDB();
$sql = 'SELECT temperature, humidity, wind_speed, rainfall, recorded_at, location
        FROM weather_logs WHERE user_id = ?';
$params = [(int) $_SESSION['user_id']];

if ($city) {
    $sql .= ' AND location LIKE ?';
    $params[] = '%' . $city . '%';
}
$sql .= ' ORDER BY recorded_at DESC LIMIT ' . $limit;

$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = array_reverse($stmt->fetchAll());

if (count($rows) < 2) {
    sendError('Need at least 2 weather log entries. Search weather on the dashboard first.', 422);
}

$records = array_map(static function ($r) {
    return [
        'temperature' => (float) $r['temperature'],
        'humidity'    => (float) $r['humidity'],
        'wind_speed'  => (float) $r['wind_speed'],
    ];
}, $rows);

$py = runPythonJson(ML_WEATHER_SCRIPT, ['records' => $records]);
if (!$py['ok'] || empty($py['data']['success'])) {
    sendError($py['data']['error'] ?? $py['error'] ?? 'Analysis failed', 503);
}

sendSuccess([
    'analysis' => $py['data'],
    'records'  => $rows,
]);
