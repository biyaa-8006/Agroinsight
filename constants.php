<?php
/**
 * AgroInsight — application constants (loaded from .env via env.php).
 */
require_once __DIR__ . '/env.php';
loadEnvFile();

if (!defined('APP_ENV')) {
    define('APP_ENV', env('APP_ENV', 'development'));
}
if (!defined('APP_ORIGIN')) {
    define('APP_ORIGIN', env('APP_ORIGIN', 'http://localhost'));
}

define('RATE_LIMIT_AUTH', (int) env('RATE_LIMIT_AUTH', '20'));
define('RATE_LIMIT_CHAT', (int) env('RATE_LIMIT_CHAT', '30'));
define('RATE_LIMIT_WEATHER', (int) env('RATE_LIMIT_WEATHER', '60'));
define('RATE_LIMIT_WINDOW_SECONDS', (int) env('RATE_LIMIT_WINDOW_SECONDS', '60'));

define('GEMINI_API_KEY', env('GEMINI_API_KEY', '') ?: '');
define('OPENWEATHER_API_KEY', env('OPENWEATHER_API_KEY', '') ?: '');
define('OPENWEATHER_BASE', env('OPENWEATHER_BASE', 'https://api.openweathermap.org/data/2.5'));

define('PYTHON_EXEC', env('PYTHON_EXEC', 'python'));
define('ML_TIMEOUT_SECONDS', (int) env('ML_TIMEOUT_SECONDS', '25'));
define('ML_DIR', realpath(__DIR__ . '/../../ml') ?: (__DIR__ . '/../../ml'));
define('ML_PREDICT_SCRIPT', ML_DIR . '/api/predict.py');
define('ML_WEATHER_SCRIPT', __DIR__ . '/../python/weather_analysis.py');

// Production: set STRICT_AUTH=true in .env
define('STRICT_AUTH', strtolower(env('STRICT_AUTH', 'false')) === 'true');

// SMS (Twilio optional — logs to DB when not configured)
define('TWILIO_ACCOUNT_SID', env('TWILIO_ACCOUNT_SID', '') ?: '');
define('TWILIO_AUTH_TOKEN', env('TWILIO_AUTH_TOKEN', '') ?: '');
define('TWILIO_FROM_NUMBER', env('TWILIO_FROM_NUMBER', '') ?: '');
define('SMS_MOCK_MODE', strtolower(env('SMS_MOCK_MODE', 'true')) === 'true');
