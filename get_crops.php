<?php
// ============================================================
// FILE: backend/api/crops/get_crops.php
// METHOD: GET
// PURPOSE: Return list of all available crops.
//          Used to populate the crop dropdown in the frontend.
// ============================================================

require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$db    = getDB();
$stmt  = $db->query(
    'SELECT id, name, growing_season, min_temp, max_temp, min_humidity, max_humidity
     FROM crops
     ORDER BY name ASC'
);
$crops = $stmt->fetchAll();

// Cast numeric fields properly so JSON looks clean
foreach ($crops as &$crop) {
    $crop['id']           = (int)   $crop['id'];
    $crop['min_temp']     = (float) $crop['min_temp'];
    $crop['max_temp']     = (float) $crop['max_temp'];
    $crop['min_humidity'] = (float) $crop['min_humidity'];
    $crop['max_humidity'] = (float) $crop['max_humidity'];
}

sendSuccess($crops);
?>