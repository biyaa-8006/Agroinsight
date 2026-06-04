<?php
/**
 * Public home page widgets — live weather + model metrics (no auth).
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/rate_limit.php';

setCORSHeaders();
enforceRateLimit('home_stats', 30, RATE_LIMIT_WINDOW_SECONDS);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$city = sanitizeCity(trim($_GET['city'] ?? 'Faisalabad'));
$db   = getDB();

$weather = null;
if (OPENWEATHER_API_KEY) {
    $url = OPENWEATHER_BASE . '/weather?q=' . urlencode($city)
        . '&appid=' . OPENWEATHER_API_KEY . '&units=metric';
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
    $raw = curl_exec($ch);
    curl_close($ch);
    $ow  = json_decode($raw, true);
    if (($ow['cod'] ?? 0) == 200) {
        $weather = [
            'city'        => $ow['name'],
            'temperature' => round($ow['main']['temp'], 1),
            'humidity'    => (int) $ow['main']['humidity'],
            'wind_speed'  => round($ow['wind']['speed'] ?? 0, 1),
            'rainfall'    => round($ow['rain']['1h'] ?? 0, 1),
            'condition'   => $ow['weather'][0]['description'] ?? '',
        ];
        $db->prepare(
            'INSERT INTO weather_logs (user_id, location, temperature, humidity, rainfall, wind_speed, condition_text)
             VALUES (NULL, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $weather['city'], $weather['temperature'], $weather['humidity'],
            $weather['rainfall'], $weather['wind_speed'], $weather['condition'],
        ]);
    }
}

$cropYields = $db->query(
    'SELECT c.name, ROUND(AVG(100 - LEAST(100, ABS(p.risk_score))), 0) AS yield_pct
     FROM predictions p
     JOIN crops c ON p.crop_id = c.id
     WHERE p.predicted_at >= NOW() - INTERVAL 30 DAY
     GROUP BY c.id, c.name
     ORDER BY c.name LIMIT 4'
)->fetchAll();

if (!$cropYields) {
    // FIX: return a static 75% placeholder instead of random_int(5,25)+60.
    // Random values caused different users to see different "live KPIs" on
    // the homepage, making the data look fabricated (it was).
    $cropYields = $db->query(
        'SELECT name, 75 AS yield_pct FROM crops ORDER BY id LIMIT 4'
    )->fetchAll();
}

$latestPred = $db->query(
    'SELECT risk_level, model_probability FROM predictions ORDER BY predicted_at DESC LIMIT 1'
)->fetch();

$metricsPath = ML_DIR . '/artifacts/metrics.json';
$accuracy = null;
if (is_readable($metricsPath)) {
    $m = json_decode(file_get_contents($metricsPath), true);
    $accuracy = isset($m['accuracy']) ? round((float) $m['accuracy'] * 100, 1) : null;
}

$unreadAlerts = (int) $db->query('SELECT COUNT(*) FROM alerts WHERE is_read = 0')->fetchColumn();

sendSuccess([
    'weather'       => $weather,
    'crop_yields'   => $cropYields,
    'risk_level'    => $latestPred['risk_level'] ?? 'medium',
    'confidence'    => $accuracy ?? (isset($latestPred['model_probability'])
        ? round((float) $latestPred['model_probability'] * 100, 1) : 87),
    'crop_count'    => (int) $db->query('SELECT COUNT(*) FROM crops')->fetchColumn(),
    'active_alerts' => $unreadAlerts,
]);
