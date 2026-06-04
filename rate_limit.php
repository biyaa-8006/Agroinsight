<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/response.php';

/**
 * Get the real client IP.
 *
 * X-Forwarded-For is ONLY trusted when the connection comes from a
 * known reverse-proxy IP range (127.0.0.1 for XAMPP/localhost dev).
 * For production, add your load-balancer CIDRs to $trustedProxies.
 */
function clientIp(): string {
    $trustedProxies = ['127.0.0.1', '::1'];
    $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    if (in_array($remoteAddr, $trustedProxies, true)) {
        // Only trust X-Forwarded-For when the connection is from our proxy
        $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if ($forwarded !== '') {
            // Take the first (leftmost) IP — that's the original client
            $ips = array_map('trim', explode(',', $forwarded));
            $candidate = $ips[0];
            // Basic sanity: must look like an IP
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                return substr($candidate, 0, 45);
            }
        }
    }

    return substr($remoteAddr, 0, 45);
}

/**
 * Sliding window rate limit stored in MySQL.
 * NOTE: X-Forwarded-For is no longer blindly trusted (spoofing fix).
 */
function enforceRateLimit(string $routeKey, int $maxHits, int $windowSeconds = 60): void {
    $ip = clientIp();
    $db = getDB();

    $db->prepare(
        'DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL ? SECOND)'
    )->execute([$windowSeconds * 2]);

    $sel = $db->prepare(
        'SELECT id, hits, window_start FROM rate_limits WHERE ip_address = ? AND route_key = ? LIMIT 1'
    );
    $sel->execute([$ip, $routeKey]);
    $row = $sel->fetch();

    if (!$row) {
        $db->prepare(
            'INSERT INTO rate_limits (ip_address, route_key, hits, window_start) VALUES (?, ?, 1, NOW())'
        )->execute([$ip, $routeKey]);
        return;
    }

    $elapsed = time() - strtotime($row['window_start']);
    if ($elapsed >= $windowSeconds) {
        $db->prepare(
            'UPDATE rate_limits SET hits = 1, window_start = NOW() WHERE id = ?'
        )->execute([$row['id']]);
        return;
    }

    if ((int) $row['hits'] >= $maxHits) {
        sendError('Too many requests. Please wait and try again.', 429);
    }

    $db->prepare('UPDATE rate_limits SET hits = hits + 1 WHERE id = ?')->execute([$row['id']]);
}
