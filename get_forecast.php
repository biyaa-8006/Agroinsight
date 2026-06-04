<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/rate_limit.php';
require_once __DIR__ . '/../../helpers/weather_cache.php';
require_once __DIR__ . '/../../helpers/logger.php';

setCORSHeaders();
// FIX: require authentication — prevents anonymous API quota abuse
require_once __DIR__ . '/../../helpers/auth_check.php';
enforceRateLimit('weather_forecast', RATE_LIMIT_WEATHER, RATE_LIMIT_WINDOW_SECONDS);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

if (!OPENWEATHER_API_KEY) {
    sendError('OPENWEATHER_API_KEY missing in .env', 503);
}

$city = sanitizeCity(trim($_GET['city'] ?? ''));
if (!$city) {
    sendError('city is required.');
}

// FIX: serve cached forecast if available (30-min TTL)
$cacheKey = 'weather_forecast_' . strtolower($city);
$cached = weatherCacheGet($cacheKey);
if ($cached !== null) {
    $hit = json_decode($cached, true);
    if ($hit) {
        sendSuccess($hit);
    }
}

$url = OPENWEATHER_BASE . '/forecast?q=' . urlencode($city)
    . '&appid=' . OPENWEATHER_API_KEY . '&units=metric';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 12,
]);
$raw = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

if ($err) {
    logError('weather', 'cURL failure on forecast fetch', ['city' => $city, 'error' => $err]);
    sendError('Forecast service unreachable: ' . $err, 503);
}

$data = json_decode($raw, true);
if (($data['cod'] ?? '') != 200) {
    sendError('Forecast unavailable for this city.', 404);
}

$daily = [];
foreach ($data['list'] as $item) {
    $day  = date('Y-m-d', $item['dt']);
    $temp = round((float) $item['main']['temp'], 1);
    $rain = (float) ($item['rain']['3h'] ?? 0);
    if (!isset($daily[$day])) {
        $daily[$day] = [
            'date'      => $day,
            'label'     => date('D j', $item['dt']),
            'temp_max'  => $temp,
            'temp_min'  => $temp,
            'humidity'  => (int) $item['main']['humidity'],
            'rain_mm'   => $rain,
            'condition' => $item['weather'][0]['main'] ?? '',
            'icon'      => $item['weather'][0]['icon'] ?? '',
        ];
    } else {
        $daily[$day]['temp_max'] = max($daily[$day]['temp_max'], $temp);
        $daily[$day]['temp_min'] = min($daily[$day]['temp_min'], $temp);
        $daily[$day]['rain_mm'] += $rain;
        $daily[$day]['humidity'] = (int) round(
            ($daily[$day]['humidity'] + (int) $item['main']['humidity']) / 2
        );
    }
}

$days = array_values($daily);
foreach ($days as &$d) {
    $d['rain_mm'] = round($d['rain_mm'], 1);
    $t = $d['temp_max'];
    if ($d['rain_mm'] > 15) {
        $d['impact_score'] = max(30, 80 - (int) ($d['rain_mm'] * 2));
        $d['impact_class'] = $d['impact_score'] >= 65 ? 'moderate' : 'poor';
    } elseif ($t > 38) {
        $d['impact_score'] = 45;
        $d['impact_class'] = 'moderate';
    } elseif ($t >= 20 && $t <= 32 && $d['rain_mm'] < 5) {
        $d['impact_score'] = 85;
        $d['impact_class'] = 'excellent';
    } else {
        $d['impact_score'] = 72;
        $d['impact_class'] = 'good';
    }
}
unset($d);

$response = [
    'city'    => $data['city']['name'] ?? $city,
    'country' => $data['city']['country'] ?? '',
    'days'    => $days,
];

// FIX: cache successful forecast response to reduce API calls
weatherCacheSet($cacheKey, json_encode($response));

sendSuccess($response);
