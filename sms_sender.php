<?php
/**
 * SMS dispatch — Twilio when configured, otherwise DB mock (FYP demo).
 */
function sendSmsMessage(PDO $db, ?int $userId, string $phone, string $message): array {
    $phone = preg_replace('/[^0-9+]/', '', $phone);
    if ($phone === '') {
        return ['ok' => false, 'error' => 'Invalid phone number'];
    }

    $status = 'mock';
    $ref    = null;

    if (!SMS_MOCK_MODE && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
        $url  = 'https://api.twilio.com/2010-04-01/Accounts/' . TWILIO_ACCOUNT_SID . '/Messages.json';
        $post = http_build_query(['From' => TWILIO_FROM_NUMBER, 'To' => $phone, 'Body' => $message]);
        $ch   = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $post,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD        => TWILIO_ACCOUNT_SID . ':' . TWILIO_AUTH_TOKEN,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $raw  = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $json = json_decode($raw, true);
        if ($code >= 200 && $code < 300) {
            $status = 'sent';
            $ref    = $json['sid'] ?? null;
        } else {
            $status = 'failed';
            $db->prepare(
                'INSERT INTO sms_logs (user_id, phone, message, status) VALUES (?, ?, ?, ?)'
            )->execute([$userId, $phone, $message, 'failed']);
            return ['ok' => false, 'error' => $json['message'] ?? 'SMS provider error'];
        }
    }

    $db->prepare(
        'INSERT INTO sms_logs (user_id, phone, message, status, provider_ref) VALUES (?, ?, ?, ?, ?)'
    )->execute([$userId, $phone, $message, $status, $ref]);

    return [
        'ok'     => true,
        'status' => $status,
        'ref'    => $ref,
        'mock'   => $status === 'mock',
    ];
}
