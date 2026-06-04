<?php
/**
 * Weather impact reports — CSV or printable HTML (Save as PDF in browser).
 */
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth_check.php';
require_once __DIR__ . '/../../helpers/sanitize.php';

$type   = sanitizeEnum($_GET['type'] ?? 'weather', ['weather', 'predictions', 'alerts'], 'weather');
$format = sanitizeEnum($_GET['format'] ?? 'csv', ['csv', 'html'], 'csv');
$city   = sanitizeCity(trim($_GET['city'] ?? 'Faisalabad'));
$userId = (int) $_SESSION['user_id'];
$db     = getDB();

$rows = [];
$title  = 'AgroInsight Report';
$headers = [];

if ($type === 'weather') {
    $title = "Weather Impact — {$city}";
    $headers = ['Recorded', 'Location', 'Temp °C', 'Humidity %', 'Rain mm', 'Wind m/s', 'Condition'];
    $stmt = $db->prepare(
        'SELECT recorded_at, location, temperature, humidity, rainfall, wind_speed, condition_text
         FROM weather_logs WHERE user_id = ? AND location LIKE ? ORDER BY recorded_at DESC LIMIT 500'
    );
    $stmt->execute([$userId, '%' . $city . '%']);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} elseif ($type === 'predictions') {
    $title = 'Crop Risk Predictions';
    $headers = ['Date', 'Crop', 'Location', 'Risk', 'Score', 'Recommendation'];
    $stmt = $db->prepare(
        'SELECT p.predicted_at, c.name, p.location, p.risk_level, p.risk_score, p.recommendation
         FROM predictions p LEFT JOIN crops c ON p.crop_id = c.id
         WHERE p.user_id = ? ORDER BY p.predicted_at DESC LIMIT 200'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} else {
    $title = 'Disaster Alerts';
    $headers = ['Created', 'Type', 'Severity', 'Message', 'Read'];
    $stmt = $db->prepare(
        'SELECT created_at, alert_type, severity, message, is_read FROM alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 200'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

if ($format === 'html') {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' . htmlspecialchars($title) . '</title>';
    echo '<style>body{font-family:Segoe UI,sans-serif;padding:24px;color:#111}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #ccc;padding:8px;font-size:12px}th{background:#e8f5e9}h1{font-size:20px;color:#1a5e2a}@media print{.no-print{display:none}}</style></head><body>';
    echo '<h1>' . htmlspecialchars($title) . '</h1>';
    echo '<p>Generated ' . date('Y-m-d H:i:s') . ' · User #' . $userId . '</p>';
    echo '<button class="no-print" onclick="window.print()">Print / Save as PDF</button>';
    echo '<table><thead><tr>';
    foreach ($headers as $h) {
        echo '<th>' . htmlspecialchars($h) . '</th>';
    }
    echo '</tr></thead><tbody>';
    foreach ($rows as $row) {
        echo '<tr>';
        foreach ($row as $cell) {
            echo '<td>' . htmlspecialchars((string) $cell) . '</td>';
        }
        echo '</tr>';
    }
    if (!$rows) {
        echo '<tr><td colspan="' . count($headers) . '">No records yet — fetch weather or run crop analysis first.</td></tr>';
    }
    echo '</tbody></table></body></html>';
    exit;
}

$filename = 'agroinsight_' . $type . '_' . date('Y-m-d') . '.csv';
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
$out = fopen('php://output', 'w');
fputcsv($out, $headers);
foreach ($rows as $row) {
    fputcsv($out, array_values($row));
}
fclose($out);
exit;
