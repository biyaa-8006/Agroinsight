<?php
require_once __DIR__ . '/../../config/bootstrap.php';
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../helpers/response.php';

setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$metricsPath = ML_DIR . '/artifacts/metrics.json';
$fiPath      = ML_DIR . '/artifacts/feature_importance.json';

if (!is_file($metricsPath)) {
    sendError('Model not trained yet. Run: python ml/train_model.py', 503);
}

$metrics = json_decode(file_get_contents($metricsPath), true);
$importance = is_file($fiPath)
    ? json_decode(file_get_contents($fiPath), true)
    : [];

sendSuccess([
    'metrics'            => $metrics,
    'feature_importance' => $importance,
    'model_file'         => 'ml/artifacts/model.joblib',  // FIX: was 'model.pkl' which does not exist
]);
