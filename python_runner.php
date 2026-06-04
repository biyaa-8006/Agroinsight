<?php
/**
 * Run Python scripts via proc_open (no shell_exec).
 * Pass JSON on stdin; read JSON from stdout.
 */
function runPythonJson(string $scriptPath, array $payload, ?int $timeoutSeconds = null): array {
    require_once __DIR__ . '/../config/constants.php';

    if (!is_file($scriptPath)) {
        return ['ok' => false, 'error' => 'Python script not found: ' . $scriptPath];
    }

    $timeout = $timeoutSeconds ?? ML_TIMEOUT_SECONDS;
    $python  = PYTHON_EXEC;
    $jsonIn  = json_encode($payload, JSON_UNESCAPED_UNICODE);

    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];

    $cmd = [$python, $scriptPath];
    $proc = proc_open($cmd, $descriptors, $pipes, dirname($scriptPath), null, ['bypass_shell' => true]);

    if (!is_resource($proc)) {
        return ['ok' => false, 'error' => 'Failed to start Python process'];
    }

    fwrite($pipes[0], $jsonIn);
    fclose($pipes[0]);

    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);

    $stdout = '';
    $stderr = '';
    $start  = time();

    while (true) {
        $stdout .= stream_get_contents($pipes[1]);
        $stderr .= stream_get_contents($pipes[2]);
        $status = proc_get_status($proc);
        if (!$status['running']) {
            break;
        }
        if ((time() - $start) > $timeout) {
            proc_terminate($proc);
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($proc);
            return ['ok' => false, 'error' => 'Python process timed out after ' . $timeout . 's'];
        }
        usleep(50_000);
    }

    $stdout .= stream_get_contents($pipes[1]);
    $stderr .= stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($proc);

    $stdout = trim($stdout);
    if ($stdout === '') {
        return [
            'ok'    => false,
            'error' => 'Empty Python output' . ($stderr ? ': ' . $stderr : ''),
            'code'  => $exitCode,
        ];
    }

    $decoded = json_decode($stdout, true);
    if (!is_array($decoded)) {
        return [
            'ok'    => false,
            'error' => 'Invalid JSON from Python: ' . substr($stdout, 0, 300),
            'stderr'=> $stderr,
        ];
    }

    if ($exitCode !== 0 && empty($decoded['success']) && empty($decoded['ok'])) {
        $decoded['ok'] = false;
        if (empty($decoded['error'])) {
            $decoded['error'] = $stderr ?: 'Python exited with code ' . $exitCode;
        }
    }

    return ['ok' => true, 'data' => $decoded, 'stderr' => $stderr];
}
