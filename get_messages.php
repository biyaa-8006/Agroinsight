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
$stmt = $db->query(
    'SELECT id, name, email, subject, message, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 100'
);
sendSuccess(['messages' => $stmt->fetchAll()]);
