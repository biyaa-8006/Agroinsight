<?php
/**
 * AgroInsight — Input sanitisation and validation helpers 
 */

// ── STRING ────────────────────────────────────────────────────────────────────

function sanitizeString(string $value, int $maxLen = 500): string {
    return mb_substr(strip_tags(trim($value)), 0, $maxLen);
}

// ── INTEGER ───────────────────────────────────────────────────────────────────

function sanitizeInt($value, int $min = 1, int $max = PHP_INT_MAX): int {
    $v = filter_var($value, FILTER_VALIDATE_INT);
    if ($v === false) {
        return $min;
    }
    return max($min, min($max, (int) $v));
}

// ── FLOAT ─────────────────────────────────────────────────────────────────────

function sanitizeFloat($value, float $min = 0.0, float $max = PHP_FLOAT_MAX): float {
    $v = filter_var($value, FILTER_VALIDATE_FLOAT);
    if ($v === false) {
        return $min;
    }
    return max($min, min($max, (float) $v));
}

// ── EMAIL  ←── WAS MISSING — this is the root cause of the login network error ──

/**
 * Sanitise and validate an email address.
 *
 * Returns a clean, lowercase email string on success.
 * Returns null if the value is not a valid email address.
 *
 * Usage (existing code in login.php / register.php):
 *   $email = sanitizeEmail($body['email'] ?? '') ?? '';
 *   if (!$email) sendError('Invalid email address.');
 */
function sanitizeEmail(string $value): ?string {
    $value = mb_strtolower(trim($value));
    // Remove any characters that can never appear in a valid email
    $value = filter_var($value, FILTER_SANITIZE_EMAIL);
    if ($value === false || $value === '') {
        return null;
    }
    // Final validation
    $clean = filter_var($value, FILTER_VALIDATE_EMAIL);
    return $clean !== false ? $clean : null;
}

// ── CITY ──────────────────────────────────────────────────────────────────────

function sanitizeCity(string $value): string {
    // Only allow letters, spaces, hyphens — strips SQL/HTML injection vectors
    $clean = preg_replace('/[^a-zA-Z\s\-]/', '', $value);
    return mb_substr(trim($clean), 0, 100);
}

// ── ML INPUTS ─────────────────────────────────────────────────────────────────

/**
 * Validate soil/weather inputs for ML prediction.
 * Returns an error string on failure, null on success.
 */
function validateMlInputs(array $data): ?string {
    $ranges = [
        'N'           => [0,   300],
        'P'           => [0,   200],
        'K'           => [0,   300],
        'ph'          => [0,   14 ],
        'temperature' => [-10, 60 ],
        'humidity'    => [0,   100],
        'rainfall'    => [0,   5000],
    ];
    foreach ($ranges as $field => [$min, $max]) {
        if (!array_key_exists($field, $data)) {
            continue; // optional fields are fine
        }
        $val = filter_var($data[$field], FILTER_VALIDATE_FLOAT);
        if ($val === false) {
            return "Field '$field' must be a number.";
        }
        if ($val < $min || $val > $max) {
            return "Field '$field' must be between $min and $max (got $val).";
        }
    }
    return null;
}

function sanitizeEnum(string $value, array $allowed, string $default = ''): string {
    $value = strtolower(trim($value));
    return in_array($value, $allowed, true) ? $value : $default;
}
