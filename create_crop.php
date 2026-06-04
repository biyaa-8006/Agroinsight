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

$body = getRequestBody();
$name = sanitizeString($body['name'] ?? '', 100);
if (!$name) {
    sendError('Crop name is required.');
}

$db = getDB();
$db->prepare(
    'INSERT INTO crops (name, min_temp, max_temp, min_humidity, max_humidity, min_rainfall, max_rainfall, growing_season)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
)->execute([
    $name,
    sanitizeFloat($body['min_temp'] ?? 15, -50, 60),
    sanitizeFloat($body['max_temp'] ?? 35, -50, 60),
    sanitizeFloat($body['min_humidity'] ?? 40, 0, 100),
    sanitizeFloat($body['max_humidity'] ?? 80, 0, 100),
    sanitizeFloat($body['min_rainfall'] ?? 200, 0, 10000),
    sanitizeFloat($body['max_rainfall'] ?? 800, 0, 10000),
    sanitizeString($body['growing_season'] ?? 'Year-round', 100),
]);

sendSuccess(['id' => (int) $db->lastInsertId(), 'message' => 'Crop created.'], 201);
