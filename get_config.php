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
try {
    $rows = $db->query('SELECT config_key, config_value, updated_at FROM system_config')->fetchAll();
} catch (PDOException $e) {
    sendSuccess(['config' => [], 'note' => 'Run database/schema_updates.sql']);
}

$config = [];
foreach ($rows as $r) {
    $config[$r['config_key']] = $r['config_value'];
}

sendSuccess(['config' => $config]);
