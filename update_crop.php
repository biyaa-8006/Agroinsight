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

$body   = getRequestBody();
$cropId = sanitizeInt($body['id'] ?? 0, 1, 1000);
if (!$cropId) {
    sendError('Valid crop id required.');
}

$db = getDB();
$chk = $db->prepare('SELECT id FROM crops WHERE id = ?');
$chk->execute([$cropId]);
if (!$chk->fetch()) {
    sendError('Crop not found.', 404);
}

$map = [
    'name' => 'name', 'min_temp' => 'min_temp', 'max_temp' => 'max_temp',
    'min_humidity' => 'min_humidity', 'max_humidity' => 'max_humidity',
    'min_rainfall' => 'min_rainfall', 'max_rainfall' => 'max_rainfall',
    'growing_season' => 'growing_season',
];
$fields = [];
$params = [];
foreach ($map as $key => $col) {
    if (!array_key_exists($key, $body)) {
        continue;
    }
    if ($key === 'name' || $key === 'growing_season') {
        $val = sanitizeString((string) $body[$key], 100);
    } else {
        $val = sanitizeFloat($body[$key], -50, 5000);
    }
    $fields[] = "$col = ?";
    $params[] = $val;
}
if (!$fields) {
    sendError('No fields to update.');
}
$params[] = $cropId;
$db->prepare('UPDATE crops SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);

sendSuccess(['message' => 'Crop updated.']);
