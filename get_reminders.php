<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$userId = (int) $_SESSION['user_id'];
$db     = getDB();

try {
    $stmt = $db->prepare(
        'SELECT r.*, c.name AS crop_name FROM crop_reminders r
         LEFT JOIN crops c ON r.crop_id = c.id
         WHERE r.user_id = ? ORDER BY r.due_date ASC LIMIT 50'
    );
    $stmt->execute([$userId]);
    sendSuccess(['reminders' => $stmt->fetchAll()]);
} catch (PDOException $e) {
    sendSuccess(['reminders' => [], 'note' => 'Import schema_updates.sql for reminders table.']);
}
