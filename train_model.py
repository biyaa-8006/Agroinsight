"""
Offline model training — run once after downloading the dataset.

    pip install -r ml/requirements.txt
    python datasets/download_dataset.py
    python ml/train_model.py

Outputs:
    ml/artifacts/model.joblib
    ml/artifacts/metrics.json
    ml/artifacts/confusion_matrix.txt
    ml/artifacts/feature_importance.json
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import (
    train_test_split,
    cross_val_score,
)

from preprocess import (
    ARTIFACTS,
    prepare_training_frame,
    fit_scaler,
    load_raw_dataframe,
    save_artifacts,
)

RANDOM_STATE = 42


def ensure_dataset() -> None:
    from preprocess import resolve_dataset_path, DATA_PATH

    try:
        resolve_dataset_path()
    except FileNotFoundError:
        import subprocess
        import sys

        script = Path(__file__).resolve().parents[1] / "datasets" / "download_dataset.py"
        print(f"Dataset missing — running {script.name} …")
        subprocess.run([sys.executable, str(script)], check=True)


def main() -> None:
    ensure_dataset()
    print("Loading dataset…")
    df = load_raw_dataframe()
    print(f"  {len(df)} rows, {df['label'].nunique()} crop classes")

    _, X, y, label_encoder, crop_profiles = prepare_training_frame(df)
    scaler = fit_scaler(X)
    X_scaled = scaler.transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    print("Training RandomForest…")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring="accuracy")
    cm = confusion_matrix(y_test, y_pred)
    report = classification_report(
        y_test, y_pred, target_names=label_encoder.classes_, zero_division=0
    )

    importances = dict(
        zip(
            __import__("preprocess").FEATURE_COLUMNS,
            [round(float(v), 4) for v in model.feature_importances_],
        )
    )

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, ARTIFACTS / "model.joblib")
    # NOTE: model.pkl removed — only model.joblib is used. pkl was a 2MB duplicate.
    save_artifacts(scaler, label_encoder, crop_profiles)

    metrics = {
        "model": "RandomForestClassifier",
        "n_estimators": 200,
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "accuracy": round(float(acc), 4),
        "cv_mean_accuracy": round(float(cv_scores.mean()), 4),
        "cv_std_accuracy": round(float(cv_scores.std()), 4),
        "classes": list(label_encoder.classes_),
        "risk_thresholds": {
            "low_min_probability": 0.45,
            "medium_min_probability": 0.18,
        },
    }
    (ARTIFACTS / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (ARTIFACTS / "feature_importance.json").write_text(
        json.dumps(importances, indent=2), encoding="utf-8"
    )
    (ARTIFACTS / "classification_report.txt").write_text(report, encoding="utf-8")
    (ARTIFACTS / "confusion_matrix.txt").write_text(
        "Labels: " + ", ".join(label_encoder.classes_) + "\n\n" + str(cm),
        encoding="utf-8",
    )

    print("\n=== Evaluation ===")
    print(f"Test accuracy:     {acc:.4f}")
    print(f"5-fold CV mean:    {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
    print("\nClassification report:\n", report)
    print("Feature importance:", json.dumps(importances, indent=2))
    print(f"\nArtifacts saved to {ARTIFACTS}")
    print("Next: PHP inference calls ml/api/predict.py (no retraining).")


if __name__ == "__main__":
    main()
