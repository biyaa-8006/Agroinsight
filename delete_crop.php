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

$cropId = sanitizeInt(getRequestBody()['id'] ?? 0, 1, 1000);
if (!$cropId) {
    sendError('Valid crop id required.');
}

$db = getDB();
$stmt = $db->prepare('DELETE FROM crops WHERE id = ?');
$stmt->execute([$cropId]);
if ($stmt->rowCount() === 0) {
    sendError('Crop not found.', 404);
}

sendSuccess(['message' => 'Crop deleted.']);
