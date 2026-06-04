<?php
require_once __DIR__ . '/auth_check.php';

if (($_SESSION['user_role'] ?? '') !== 'admin') {
    sendError('Forbidden. Admin access required.', 403);
}
