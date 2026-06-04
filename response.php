<?php
/**
 * AgroInsight — Standardised JSON responses  
 */

// ── CORS HELPERS ──────────────────────────────────────────────────────────────

/**
 * All localhost variants that should be treated as trusted origins.
 * Extend this list if your dev setup uses a different port.
 */
function getAllowedOrigins(): array {
    $configured = defined('APP_ORIGIN') ? APP_ORIGIN : 'http://localhost';

    // FIX: only include localhost variants in non-production environments.
    // In production, only the configured APP_ORIGIN is trusted.
    $isProduction = defined('APP_ENV') && APP_ENV === 'production';

    if ($isProduction) {
        return [$configured];
    }

    return array_unique([
        $configured,
        'http://localhost',
        'http://localhost:80',
        'http://localhost:8080',
        'http://127.0.0.1',
        'http://127.0.0.1:80',
        'http://127.0.0.1:8080',
        'http://[::1]',
    ]);
}

function setCORSHeaders(): void {
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

    // Pick the matching allowed origin, or fall back to the configured one
    $allowedOrigins = getAllowedOrigins();
    if ($requestOrigin && in_array($requestOrigin, $allowedOrigins, true)) {
        $origin = $requestOrigin;
    } else {
        // Same-origin requests (e.g. curl, direct PHP) have no Origin header
        $origin = defined('APP_ORIGIN') ? APP_ORIGIN : 'http://localhost';
    }

    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');

    // Answer pre-flight immediately
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit();
    }
}

// ── RESPONSE SENDERS ─────────────────────────────────────────────────────────

function sendSuccess($data, int $code = 200): void {
    // Discard any buffered PHP warnings/notices before sending clean JSON
    if (ob_get_level()) {
        ob_end_clean();
    }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success'     => true,
        'data'        => $data,
        'server_time' => date('Y-m-d H:i:s'),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function sendError(string $message, int $code = 400): void {
    // Discard any buffered PHP warnings/notices before sending clean JSON
    if (ob_get_level()) {
        ob_end_clean();
    }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error'   => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// ── REQUEST BODY PARSER ───────────────────────────────────────────────────────

function getRequestBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
