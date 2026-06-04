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
$config = $body['config'] ?? $body;
if (!is_array($config) || !$config) {
    sendError('Config object required.');
}

$db  = getDB();
$ins = $db->prepare(
    'INSERT INTO system_config (config_key, config_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)'
);

foreach ($config as $key => $value) {
    $key = preg_replace('/[^a-z0-9_]/', '', strtolower((string) $key));
    if ($key === '') {
        continue;
    }
    $ins->execute([$key, sanitizeString((string) $value, 2000)]);
}

sendSuccess(['message' => 'Configuration saved.']);
