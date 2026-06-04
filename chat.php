<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);
if (!ob_get_level()) {
    ob_start();
}

require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/csrf.php';
require_once __DIR__ . '/../../helpers/sanitize.php';
require_once __DIR__ . '/../../helpers/rate_limit.php';
require_once __DIR__ . '/../../helpers/logger.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}

validateCsrf();
// FIX: require authentication — CSRF token is publicly obtainable so it alone
// does NOT prevent anonymous Gemini quota abuse. Auth is also needed.
require_once __DIR__ . '/../../helpers/auth_check.php';
enforceRateLimit('chatbot', RATE_LIMIT_CHAT, RATE_LIMIT_WINDOW_SECONDS);

$body = getRequestBody();

$message = sanitizeString($body['message'] ?? '', 2000);
$history = is_array($body['history'] ?? null) ? $body['history'] : [];

if (empty($message)) {
    sendError('Message is required.');
}

/*
|--------------------------------------------------------------------------
| Build conversation history
|--------------------------------------------------------------------------
*/
$contents = [];

foreach ($history as $turn) {

    $role = $turn['role'] ?? '';

    $text = sanitizeString(
        $turn['parts'][0]['text'] ?? '',
        2000
    );

    if (
        !in_array($role, ['user', 'model'], true)
        || empty($text)
    ) {
        continue;
    }

    $contents[] = [
        'role'  => $role,
        'parts' => [
            ['text' => $text]
        ]
    ];
}

$contents[] = [
    'role'  => 'user',
    'parts' => [
        ['text' => $message]
    ]
];

/*
|--------------------------------------------------------------------------
| Gemini Request
|--------------------------------------------------------------------------
*/
$payload = json_encode([
    'system_instruction' => [
        'parts' => [
            [
                'text' => 'You are AgriWeather AI. Help Pakistani farmers with weather, crops, irrigation, yield prediction, farming practices, and agricultural guidance.'
            ]
        ]
    ],
    'contents' => $contents,
    'generationConfig' => [
        'temperature' => 0.7,
        'maxOutputTokens' => 800
    ]
]);

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . GEMINI_API_KEY;

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json'
    ],
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT        => 60,
]);

$raw = curl_exec($ch);
$curlErr = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

/*
|--------------------------------------------------------------------------
| Detect leaked output
|--------------------------------------------------------------------------
*/
$leaked = ob_get_clean();

if (!empty($leaked)) {
    sendError('Unexpected output detected: ' . $leaked, 500);
}

/*
|--------------------------------------------------------------------------
| CURL Error
|--------------------------------------------------------------------------
*/
if (!empty($curlErr)) {
    logError('chatbot', 'Gemini API cURL failure', ['error' => $curlErr]);
    sendError('AI service unreachable: ' . $curlErr, 503);
}

/*
|--------------------------------------------------------------------------
| Empty Response
|--------------------------------------------------------------------------
*/
if (empty($raw)) {
    sendError('Empty response received from Gemini API.', 502);
}

/*
|--------------------------------------------------------------------------
| Decode JSON
|--------------------------------------------------------------------------
*/
$result = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    sendError(
        'Invalid JSON received from Gemini API: ' .
        json_last_error_msg(),
        502
    );
}

/*
|--------------------------------------------------------------------------
| Gemini API Error
|--------------------------------------------------------------------------
*/
if (isset($result['error'])) {

    $apiMessage = $result['error']['message']
        ?? 'Unknown Gemini API error';

    sendError($apiMessage, $httpCode ?: 502);
}

/*
|--------------------------------------------------------------------------
| Extract AI Reply
|--------------------------------------------------------------------------
*/
$text =
    $result['candidates'][0]['content']['parts'][0]['text']
    ?? null;

if (empty($text)) {

    sendError(
        'AI returned empty response.',
        502
    );
}

/*
|--------------------------------------------------------------------------
| Success Response
|--------------------------------------------------------------------------
*/
sendSuccess([
    'reply' => trim($text)
]);