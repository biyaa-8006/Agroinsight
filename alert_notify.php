<?php
/**
 * Optional SMS when user has alert_sms enabled.
 */
function notifyUserIfSmsEnabled(PDO $db, int $userId, string $message): void {
    if (!defined('SMS_MOCK_MODE')) {
        require_once __DIR__ . '/../config/constants.php';
    }
    if (!function_exists('sendSmsMessage')) {
        require_once __DIR__ . '/sms_sender.php';
    }
    $stmt = $db->prepare(
        'SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ? AND pref_key IN (?, ?)'
    );
    $stmt->execute([$userId, 'alert_sms', 'phone']);
    $prefs = [];
    while ($row = $stmt->fetch()) {
        $prefs[$row['pref_key']] = $row['pref_value'];
    }
    if (($prefs['alert_sms'] ?? '0') !== '1') {
        return;
    }
    $phone = $prefs['phone'] ?? '';
    if ($phone === '') {
        return;
    }
    sendSmsMessage($db, $userId, $phone, mb_substr($message, 0, 320));
}
