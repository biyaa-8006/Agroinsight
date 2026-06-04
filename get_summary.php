<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$db = getDB();

$market = $db->query(
    'SELECT crop_name, unit, price_current, price_week_ago, price_month_ago,
            shock_cause, severity, updated_at
     FROM crop_market_prices
     ORDER BY crop_name'
)->fetchAll();

$districtLoss = $db->query(
    'SELECT d.district,
            ROUND(100 - (d.yield_t_ha / mx.max_yield * 100), 1) AS loss_pct,
            d.yield_t_ha,
            c.name AS crop_name
     FROM district_yields d
     JOIN crops c ON c.id = d.crop_id
     JOIN (
         SELECT crop_id, MAX(yield_t_ha) AS max_yield
         FROM district_yields
         GROUP BY crop_id
     ) mx ON mx.crop_id = d.crop_id
     ORDER BY loss_pct DESC
     LIMIT 20'
)->fetchAll();

$monthly = $db->query(
    'SELECT DATE_FORMAT(recorded_at, "%b") AS month_label,
            AVG(temperature) AS avg_temp,
            AVG(COALESCE(rainfall,0)) AS avg_rain
     FROM weather_logs
     WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
     GROUP BY MONTH(recorded_at), month_label
     ORDER BY MIN(recorded_at)'
)->fetchAll();

$alertCounts = $db->query(
    'SELECT severity, COUNT(*) AS cnt FROM alerts GROUP BY severity'
)->fetchAll();

// ── Economic policies from DB ────────────────────────────────
// Populated via schema.sql INSERT seeds.  Falls back to empty array
// when the table is not yet seeded (fresh install).
$policiesRaw = $db->query(
    'SELECT icon, title, impact, roi FROM economic_policies ORDER BY sort_order ASC'
)->fetchAll();
$policies = array_map(function ($r) {
    return [
        'icon'   => $r['icon'],
        'title'  => $r['title'],
        'impact' => $r['impact'],
        'roi'    => $r['roi'],
    ];
}, $policiesRaw);

sendSuccess([
    'market'          => $market,
    'district_losses' => $districtLoss,
    'monthly_climate' => $monthly,
    'alert_breakdown' => $alertCounts,
    'policies'        => $policies,
]);
