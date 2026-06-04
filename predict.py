#!/usr/bin/env python3
"""
Inference-only crop suitability / risk API.
Reads JSON from stdin, writes JSON to stdout.

Example:
  echo '{"temperature":28,"humidity":65,"rainfall":120,"target_crop":"wheat"}' | python ml/api/predict.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from preprocess import (  # noqa: E402
    FEATURE_COLUMNS,
    build_feature_vector,
    load_artifacts,
    normalize_label,
    crop_suitability_from_probability,
)


def main() -> None:
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as exc:
        print(json.dumps({"success": False, "error": f"Invalid JSON: {exc}"}))
        sys.exit(1)

    required = ["temperature", "humidity"]
    for key in required:
        if key not in payload:
            print(json.dumps({"success": False, "error": f"Missing field: {key}"}))
            sys.exit(1)

    # ── SERVER-SIDE INPUT VALIDATION ─────────────────────────────
    FIELD_RANGES = {
        'N':           (0, 300),
        'P':           (0, 200),
        'K':           (0, 300),
        'ph':          (0, 14),
        'temperature': (-10, 60),
        'humidity':    (0, 100),
        'rainfall':    (0, 5000),
    }
    for field, (fmin, fmax) in FIELD_RANGES.items():
        if field in payload:
            try:
                val = float(payload[field])
            except (TypeError, ValueError):
                print(json.dumps({"success": False, "error": f"Field '{field}' must be a number"}))
                sys.exit(1)
            if not (fmin <= val <= fmax):
                print(json.dumps({"success": False, "error": f"Field '{field}' must be between {fmin} and {fmax} (got {val})"}))
                sys.exit(1)


    target = normalize_label(payload.get("target_crop", "wheat"))

    try:
        model, scaler, label_encoder, profiles = load_artifacts()
    except FileNotFoundError as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)

    X = build_feature_vector(payload, profiles)
    X_scaled = scaler.transform(X)

    proba = model.predict_proba(X_scaled)[0]
    classes = [normalize_label(c) for c in label_encoder.classes_]
    prob_map = {cls: float(p) for cls, p in zip(classes, proba)}

    best_idx = int(proba.argmax())
    predicted_crop = classes[best_idx]
    best_probability = float(proba[best_idx])

    target_prob = prob_map.get(target, 0.0)
    # FIX: use crop_suitability_from_probability — this model predicts suitability,
    # not risk.  Output keys renamed accordingly.
    suitability_level, suitability_score = crop_suitability_from_probability(target_prob)

    top3 = sorted(prob_map.items(), key=lambda x: x[1], reverse=True)[:3]

    recommendation = (
        f"Model recommends **{predicted_crop}** ({best_probability:.0%} confidence) "
        f"for current conditions. "
    )
    if target == predicted_crop:
        recommendation += f"Your crop **{target}** aligns well — maintain standard practices."
    else:
        recommendation += (
            f"Selected crop **{target}** has only {target_prob:.0%} suitability — "
            f"consider irrigation adjustment, soil testing, or crop rotation."
        )

    out = {
        "success": True,
        "features_used": FEATURE_COLUMNS,
        "target_crop": target,
        "predicted_crop": predicted_crop,
        "predicted_probability": round(best_probability, 4),
        "target_probability": round(target_prob, 4),
        # FIX: renamed from risk_level/risk_score to suitability_level/suitability_score.
        # A high score means conditions are GOOD for this crop (not high risk).
        "suitability_level": suitability_level,
        "suitability_score": suitability_score,
        # Keep risk_level as a deprecated alias so existing DB/frontend code does not break.
        # Remove after frontend is updated to use suitability_level.
        "risk_level": suitability_level,
        "risk_score": suitability_score,
        "top3_crops": [{"crop": c, "probability": round(p, 4)} for c, p in top3],
        "recommendation": recommendation,
        "feature_vector": {
            col: round(float(val), 3)
            for col, val in zip(
                FEATURE_COLUMNS,
                build_feature_vector(payload, profiles).tolist()[0],
            )
        },
    }
    print(json.dumps(out))


if __name__ == "__main__":
    main()
