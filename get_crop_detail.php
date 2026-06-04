<?php
// ============================================================
// FILE: backend/api/crops/get_crop_detail.php
// METHOD: GET
// PARAMS: ?id=1
// PURPOSE: Return full details for a single crop.
// ============================================================

session_start();
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

setCORSHeaders();

$cropId = intval($_GET['id'] ?? 0);
if (!$cropId) {
    sendError('Crop ID is required. Pass ?id=1 in the URL.');
}

$db   = getDB();
$stmt = $db->prepare('SELECT * FROM crops WHERE id = ? LIMIT 1');
$stmt->execute([$cropId]);
$crop = $stmt->fetch();

if (!$crop) {
    sendError('Crop not found.', 404);
}

$crop['id']           = (int)   $crop['id'];
$crop['min_temp']     = (float) $crop['min_temp'];
$crop['max_temp']     = (float) $crop['max_temp'];
$crop['min_humidity'] = (float) $crop['min_humidity'];
$crop['max_humidity'] = (float) $crop['max_humidity'];
$crop['min_rainfall'] = (float) $crop['min_rainfall'];
$crop['max_rainfall'] = (float) $crop['max_rainfall'];

sendSuccess($crop);
?>