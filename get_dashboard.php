<?php
/**
 * Live dashboard aggregates for Analysis.html
 * Auth: required (user must be logged in)
 * GET ?crop_id=1&city=Faisalabad
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$cropId = sanitizeInt($_GET['crop_id'] ?? 1, 1, 1000);
$city   = sanitizeCity(trim($_GET['city'] ?? 'Faisalabad'));

$db     = getDB();
$userId = (int) $_SESSION['user_id'];

// ── Crop details ──────────────────────────────────────────────
$cropStmt = $db->prepare('SELECT * FROM crops WHERE id = ?');
$cropStmt->execute([$cropId]);
$crop = $cropStmt->fetch();
if (!$crop) {
    sendError('Crop not found', 404);
}

// ── All crops (for selector) ──────────────────────────────────
$allCrops = $db->query('SELECT id, name FROM crops ORDER BY name')->fetchAll();

// ── Weather history (last 60 logs for this user+city) ─────────
$hist = $db->prepare(
    'SELECT temperature, humidity, rainfall, wind_speed, recorded_at
     FROM weather_logs
     WHERE user_id = ? AND location LIKE ?
     ORDER BY recorded_at DESC LIMIT 60'
);
$hist->execute([$userId, '%' . $city . '%']);
$weatherRows = array_reverse($hist->fetchAll());

// ── Latest ML prediction for this crop ───────────────────────
$pred = $db->prepare(
    'SELECT risk_level, risk_score, model_probability, predicted_crop, recommendation, predicted_at
     FROM predictions
     WHERE user_id = ? AND crop_id = ?
     ORDER BY predicted_at DESC LIMIT 1'
);
$pred->execute([$userId, $cropId]);
$latestPred = $pred->fetch() ?: null;

// ── District yields ───────────────────────────────────────────
$yieldStmt = $db->prepare(
    'SELECT district, yield_t_ha, season, year
     FROM district_yields
     WHERE crop_id = ?
     ORDER BY yield_t_ha DESC'
);
$yieldStmt->execute([$cropId]);
$districtYields = $yieldStmt->fetchAll();

// ── Monthly weather aggregates (for history chart) ────────────
$monthly = $db->prepare(
    'SELECT DATE_FORMAT(recorded_at, "%Y-%m") AS ym,
            ROUND(AVG(temperature), 2)         AS avg_temp,
            ROUND(AVG(humidity), 2)            AS avg_hum,
            ROUND(AVG(COALESCE(rainfall,0)),2) AS avg_rain
     FROM weather_logs
     WHERE user_id = ?
     GROUP BY ym
     ORDER BY ym ASC
     LIMIT 24'
);
$monthly->execute([$userId]);
$monthlyWeather = $monthly->fetchAll();

// ── Fallback: empty array when DB has no weather data yet ─────────────────
// Charts will show a 'No data yet' state on first run.
// Data populates once the user checks weather via the Weather page.
if (empty($monthlyWeather)) {
    $monthlyWeather = [];
}

sendSuccess([
    'crop'              => $crop,
    'crops'             => $allCrops,
    'city'              => $city,
    'weather_history'   => $weatherRows,
    'latest_prediction' => $latestPred,
    'district_yields'   => $districtYields,
    'monthly_weather'   => $monthlyWeather,
]);
