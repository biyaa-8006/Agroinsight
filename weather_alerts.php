<?php
/**
 * Auto-create dashboard alerts when weather exceeds crop thresholds.
 */
function maybeCreateWeatherAlert(PDO $db, int $userId, int $cropId, array $weather, array $crop): void {
    $temp = (float) ($weather['temperature'] ?? 0);
    $rain = (float) ($weather['rainfall'] ?? 0);
    $wind = (float) ($weather['wind_speed'] ?? 0);
    $minT = (float) $crop['min_temp'];
    $maxT = (float) $crop['max_temp'];
    $maxR = (float) $crop['max_rainfall'];

    $checks = [];
    if ($temp > $maxT + 3) {
        $checks[] = ['heat', 'critical', "Extreme heat ({$temp}°C) exceeds safe range for {$crop['name']}. Irrigate early morning; provide shade for vegetables."];
    } elseif ($temp > $maxT) {
        $checks[] = ['heat', 'high', "High temperature ({$temp}°C) may stress {$crop['name']}. Monitor soil moisture closely."];
    }
    if ($temp < $minT - 2) {
        $checks[] = ['frost', 'high', "Low temperature ({$temp}°C) below optimal for {$crop['name']}. Use frost protection if needed."];
    }
    if ($rain > $maxR * 0.15) {
        $checks[] = ['flood', 'high', "Heavy rainfall detected. Check drainage and delay harvest if soil is saturated."];
    }
    if ($wind >= 15) {
        $checks[] = ['weather', 'medium', "Strong winds ({$wind} m/s). Secure equipment and protect young plants."];
    }

    foreach ($checks as [$type, $severity, $message]) {
        $dup = $db->prepare(
            'SELECT id FROM alerts WHERE user_id = ? AND crop_id = ? AND alert_type = ?
             AND severity = ? AND created_at >= NOW() - INTERVAL 6 HOUR LIMIT 1'
        );
        $dup->execute([$userId, $cropId, $type, $severity]);
        if ($dup->fetch()) {
            continue;
        }
        $db->prepare(
            'INSERT INTO alerts (user_id, crop_id, alert_type, message, severity) VALUES (?, ?, ?, ?, ?)'
        )->execute([$userId, $cropId, $type, $message, $severity]);
    }
}

function seedDefaultReminders(PDO $db, int $userId, string $cropName, string $season): void {
    $exists = $db->prepare('SELECT COUNT(*) FROM crop_reminders WHERE user_id = ?');
    $exists->execute([$userId]);
    if ((int) $exists->fetchColumn() > 0) {
        return;
    }
    $due = date('Y-m-d', strtotime('+7 days'));
    $rows = [
        ['Irrigation check', "Review irrigation schedule for {$cropName} based on soil moisture.", $due],
        ['Fertilizer window', "Apply recommended NPK for {$cropName} during {$season} season.", date('Y-m-d', strtotime('+14 days'))],
    ];
    $ins = $db->prepare(
        'INSERT INTO crop_reminders (user_id, title, message, due_date) VALUES (?, ?, ?, ?)'
    );
    foreach ($rows as $r) {
        $ins->execute([$userId, $r[0], $r[1], $r[2]]);
    }
}
