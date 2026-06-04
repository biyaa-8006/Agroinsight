<?php
/**
 * AgroInsight — Centralized error/event logger
 *
 * FIX: previously only login.php and register.php had error_log() calls.
 * Weather failures, ML errors, economics API errors all failed silently.
 * Include this file in any backend endpoint that needs structured logging.
 *
 * Usage:
 *   logError('weather', 'OpenWeatherMap timeout', ['city' => $city]);
 *   logInfo('ml', 'Prediction complete', ['crop' => $crop, 'score' => $score]);
 */

define('LOG_FILE', __DIR__ . '/../logs/agroinsight.log');

function _writeLog(string $level, string $module, string $message, array $context = []): void {
    $logDir = dirname(LOG_FILE);
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0750, true);
    }
    $ctx  = $context ? ' | ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '';
    $line = sprintf(
        "[%s] [%s] [%s] %s%s\n",
        date('Y-m-d H:i:s'),
        strtoupper($level),
        strtoupper($module),
        $message,
        $ctx
    );
    @file_put_contents(LOG_FILE, $line, FILE_APPEND | LOCK_EX);
    // Also send to PHP's own error_log so it shows in Apache/PHP logs
    error_log(rtrim($line));
}

function logError(string $module, string $message, array $context = []): void {
    _writeLog('error', $module, $message, $context);
}

function logWarning(string $module, string $message, array $context = []): void {
    _writeLog('warn', $module, $message, $context);
}

function logInfo(string $module, string $message, array $context = []): void {
    _writeLog('info', $module, $message, $context);
}
