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

$districtsParam = $_GET['districts'] ?? '';
if (!$districtsParam) {
    sendError('Districts parameter is required.');
}

$districts = json_decode($districtsParam, true);
if (!is_array($districts) || empty($districts)) {
    $districts = explode(',', $districtsParam);
}

$db = getDB();

$placeholders = implode(',', array_fill(0, count($districts), '?'));
$stmt = $db->prepare(
    "SELECT id, name, email, region, phone 
     FROM users 
     WHERE role = 'farmer' 
     AND region IN ($placeholders)
     AND phone IS NOT NULL 
     AND phone != ''"
);

$stmt->execute($districts);
$farmers = $stmt->fetchAll();

sendSuccess(['farmers' => $farmers]);