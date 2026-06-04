<?php
// ============================================================
// FILE: backend/helpers/auth_check.php
// PURPOSE: Protects private API routes.
//          Include this at the TOP of any API that requires login.
//          If the user is not logged in, it immediately returns 401.
//
// USAGE:
//   require_once '../../helpers/auth_check.php';
//   // code below here only runs if user is logged in
// ============================================================

// Session must already be started before including this file
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/response.php';

if (empty($_SESSION['user_id'])) {
    sendError('Unauthorized. Please log in first.', 401);
}

// After this point, these variables are available in the including file:
// $_SESSION['user_id']   — logged-in user's ID
// $_SESSION['user_name'] — logged-in user's name
// $_SESSION['user_role'] — 'admin' or 'farmer'
?>