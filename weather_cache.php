<?php
/**
 * AgroInsight — Simple file-based weather cache
 *
 * FIX: get_weather.php, get_forecast.php, and get_home_stats.php previously
 * made a fresh HTTP request to OpenWeatherMap on every call. With a 60 req/min
 * free-tier limit, multiple concurrent users quickly exhaust the quota.
 *
 * This helper caches API responses in /tmp for a configurable TTL.
 */

define('WEATHER_CACHE_DIR', sys_get_temp_dir() . '/agroinsight_weather_cache');
define('WEATHER_CACHE_TTL_LIVE',     600);   // 10 minutes for current weather
define('WEATHER_CACHE_TTL_FORECAST', 1800);  // 30 minutes for 5-day forecast

/**
 * Return cached JSON string for $key, or null if expired/missing.
 */
function weatherCacheGet(string $key): ?string {
    $path = _weatherCachePath($key);
    if (!is_file($path)) return null;
    if ((time() - filemtime($path)) > _weatherCacheTtl($key)) {
        @unlink($path);
        return null;
    }
    $data = file_get_contents($path);
    return $data !== false ? $data : null;
}

/**
 * Write $json string to cache for $key.
 */
function weatherCacheSet(string $key, string $json): void {
    $dir = WEATHER_CACHE_DIR;
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    @file_put_contents(_weatherCachePath($key), $json, LOCK_EX);
}

function _weatherCachePath(string $key): string {
    return WEATHER_CACHE_DIR . '/' . preg_replace('/[^a-z0-9_\-]/i', '_', $key) . '.json';
}

function _weatherCacheTtl(string $key): int {
    return str_contains($key, 'forecast') ? WEATHER_CACHE_TTL_FORECAST : WEATHER_CACHE_TTL_LIVE;
}
