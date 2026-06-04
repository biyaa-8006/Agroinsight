<?php
/**
 * GET ?city=Faisalabad&crop_id=1
 * Live weather + ML inference + DB persistence.
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/rate_limit.php';
require_once __DIR__ . '/../../helpers/python_runner.php';
require_once __DIR__ . '/../../helpers/weather_alerts.php';

setCORSHeaders();
enforceRateLimit('weather_analyze', RATE_LIMIT_WEATHER, RATE_LIMIT_WINDOW_SECONDS);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

if (!OPENWEATHER_API_KEY) {
    sendError('OPENWEATHER_API_KEY missing in .env', 503);
}

$city    = sanitizeCity(trim($_GET['city'] ?? ''));
$cropId  = sanitizeInt($_GET['crop_id'] ?? 0, 1, 1000);

if (!$city) {
    sendError('city is required');
}
if (!$cropId) {
    sendError('Valid crop_id is required');
}

$db = getDB();
$cropStmt = $db->prepare('SELECT * FROM crops WHERE id = ?');
$cropStmt->execute([$cropId]);
$crop = $cropStmt->fetch();
if (!$crop) {
    sendError('Crop not found', 404);
}

$url = OPENWEATHER_BASE . '/weather?q=' . urlencode($city)
    . '&appid=' . OPENWEATHER_API_KEY . '&units=metric';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 12,
]);
$raw = curl_exec($ch);
curl_close($ch);
$ow = json_decode($raw, true);
if (($ow['cod'] ?? 0) != 200) {
    sendError('Weather lookup failed for city: ' . $city, 404);
}

$temp     = (float) $ow['main']['temp'];
$humidity = (float) $ow['main']['humidity'];
$rainfall = (float) ($ow['rain']['1h'] ?? $ow['rain']['3h'] ?? 0);
$wind     = (float) ($ow['wind']['speed'] ?? 0);

$db->prepare(
    'INSERT INTO weather_logs (user_id, location, temperature, humidity, rainfall, wind_speed, condition_text)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
)->execute([
    $_SESSION['user_id'],
    $ow['name'],
    $temp,
    $humidity,
    $rainfall,
    $wind,
    $ow['weather'][0]['description'] ?? '',
]);

$mlPayload = [
    'temperature' => $temp,
    'humidity'    => $humidity,
    'rainfall'    => max($rainfall, 50),
    'target_crop' => strtolower($crop['name']),
];

$ml = runPythonJson(ML_PREDICT_SCRIPT, $mlPayload);
if (!$ml['ok']) {
    sendError('ML inference failed: ' . ($ml['error'] ?? 'unknown'), 503);
}

$result = $ml['data'];
if (empty($result['success'])) {
    sendError($result['error'] ?? 'ML error', 503);
}

$ins = $db->prepare(
    'INSERT INTO predictions
        (user_id, crop_id, location, risk_level, risk_score, recommendation,
         model_probability, predicted_crop)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$ins->execute([
    $_SESSION['user_id'],
    $cropId,
    $ow['name'],
    $result['risk_level'],
    $result['risk_score'],
    $result['recommendation'],
    $result['target_probability'],
    $result['predicted_crop'],
]);

$wx = ['temperature' => $temp, 'humidity' => $humidity, 'rainfall' => $rainfall, 'wind_speed' => $wind];
maybeCreateWeatherAlert($db, (int) $_SESSION['user_id'], $cropId, $wx, $crop);
seedDefaultReminders($db, (int) $_SESSION['user_id'], $crop['name'], $crop['growing_season'] ?? 'Kharif');

if (in_array($result['risk_level'], ['high', 'medium'], true)) {
    $db->prepare(
        'INSERT INTO alerts (user_id, crop_id, alert_type, message, severity)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([
        $_SESSION['user_id'],
        $cropId,
        'crop',
        $result['recommendation'] ?? 'Crop risk elevated for current weather.',
        $result['risk_level'] === 'high' ? 'high' : 'medium',
    ]);
}

sendSuccess([
    'weather' => [
        'city'        => $ow['name'],
        'temperature' => $temp,
        'humidity'    => $humidity,
        'rainfall'    => $rainfall,
        'wind_speed'  => $wind,
        'condition'   => $ow['weather'][0]['description'] ?? '',
    ],
    'crop'       => ['id' => (int) $crop['id'], 'name' => $crop['name']],
    'prediction' => $result,
    'prediction_id' => (int) $db->lastInsertId(),
]);
