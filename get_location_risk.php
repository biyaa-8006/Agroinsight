<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';

setCORSHeaders();

$cropId = sanitizeInt($_GET['crop_id'] ?? 0, 1, 1000);
if (!$cropId) {
    sendError('crop_id required');
}

$db = getDB();
$stmt = $db->prepare(
    'SELECT location,
            AVG(risk_score) AS avg_risk,
            COUNT(*) AS samples,
            MAX(predicted_at) AS last_run
     FROM predictions
     WHERE crop_id = ?
     GROUP BY location
     ORDER BY avg_risk DESC
     LIMIT 50'
);
$stmt->execute([$cropId]);

sendSuccess(['locations' => $stmt->fetchAll()]);
