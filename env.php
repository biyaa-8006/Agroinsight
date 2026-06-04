<?php
/**
 * Load .env from project root into $_ENV / putenv (once per request).
 */
function loadEnvFile(): void {
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;

    $root = realpath(__DIR__ . '/../..');
    $path = $root . DIRECTORY_SEPARATOR . '.env';
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value, " \t\"'");
        if ($key !== '') {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

function env(string $key, ?string $default = null): ?string {
    loadEnvFile();
    if (array_key_exists($key, $_ENV)) {
        return $_ENV[$key];
    }
    $v = getenv($key);
    return $v !== false ? $v : $default;
}
