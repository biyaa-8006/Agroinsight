<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/rate_limit.php';
require_once __DIR__ . '/../../helpers/weather_cache.php';
require_once __DIR__ . '/../../helpers/logger.php';

setCORSHeaders();
// FIX: require authentication — prevents anonymous API quota abuse
require_once __DIR__ . '/../../helpers/auth_check.php';
enforceRateLimit('weather_live', RATE_LIMIT_WEATHER, RATE_LIMIT_WINDOW_SECONDS);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

if (!OPENWEATHER_API_KEY) {
    sendError('OPENWEATHER_API_KEY missing in .env', 503);
}

$city = sanitizeCity(trim($_GET['city'] ?? ''));
if (!$city) {
    sendError('City name is required.');
}

// FIX: serve cached response if available (10-min TTL) to avoid quota exhaustion
$cacheKey = 'weather_live_' . strtolower($city);
$cached = weatherCacheGet($cacheKey);
if ($cached !== null) {
    $hit = json_decode($cached, true);
    if ($hit) {
        sendSuccess($hit);
    }
}

$url = OPENWEATHER_BASE . '/weather?q=' . urlencode($city)
    . '&appid=' . OPENWEATHER_API_KEY . '&units=metric';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
]);
$raw = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

if ($err) {
    logError('weather', 'cURL failure on live weather fetch', ['city' => $city, 'error' => $err]);
    sendError('Weather service error: ' . $err, 503);
}

$result = json_decode($raw, true);
if (($result['cod'] ?? '') != 200) {
    sendError('City not found.', 404);
}

$weather = [
    'city'        => $result['name'],
    'country'     => $result['sys']['country'],
    'temperature' => round($result['main']['temp'], 1),
    'feels_like'  => round($result['main']['feels_like'], 1),
    'humidity'    => (int) $result['main']['humidity'],
    'pressure'    => (int) $result['main']['pressure'],
    'wind_speed'  => round($result['wind']['speed'], 1),
    'condition'   => $result['weather'][0]['description'],
    'icon'        => $result['weather'][0]['icon'],
    'icon_url'    => 'https://openweathermap.org/img/wn/' . $result['weather'][0]['icon'] . '@2x.png',
];

$db = getDB();
$db->prepare(
    'INSERT INTO weather_logs (user_id, location, temperature, humidity, rainfall, wind_speed, condition_text)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
)->execute([
    $_SESSION['user_id'] ?? null,
    $weather['city'],
    $weather['temperature'],
    $weather['humidity'],
    (float) ($result['rain']['1h'] ?? 0),
    $weather['wind_speed'],
    $weather['condition'],
]);

// FIX: cache successful response to reduce OpenWeatherMap API calls
weatherCacheSet($cacheKey, json_encode($weather));

sendSuccess($weather);
