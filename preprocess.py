"""
Shared preprocessing for offline training and runtime inference.
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler

FEATURE_COLUMNS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

ROOT = Path(__file__).resolve().parent
ARTIFACTS = ROOT / "artifacts"
DATA_PATH = ROOT.parent / "datasets" / "crop_recommendation" / "raw" / "Crop_recommendation.csv"

# Pakistan-relevant crops we expose in the app (subset of dataset labels)
# Pakistan-relevant crop aliases.
# Only semantically similar or botanically related crops are grouped.
# Non-Pakistani crops not similar to any local crop are excluded from aliases
# so the model does not misrepresent them (e.g. coconut != rice).
PAKISTAN_CROP_ALIASES = {
    # Direct matches
    "wheat": "wheat",
    "rice": "rice",
    "cotton": "cotton",
    "sugarcane": "sugarcane",
    "maize": "maize",
    "potato": "potato",
    "onion": "onion",
    "mango": "mango",
    "tomato": "tomato",
    "chickpea": "chickpea",
    # Legume synonyms (semantically valid: same soil/climate needs)
    "chick pea": "chickpea",
    "gram": "chickpea",
    "blackgram": "chickpea",      # similar legume soil requirements
    "mungbean": "chickpea",       # similar legume growing conditions
    "lentil": "chickpea",         # similar legume growing conditions
    "kidneybeans": "chickpea",    # legume
    "pigeonpeas": "chickpea",     # legume
    "mothbeans": "chickpea",      # legume
    # Cotton-family (fiber crops with similar agronomics)
    "jute": "cotton",             # fiber crop, similar tropical conditions
    # Maize synonyms
    "corn": "maize",
}
# NOTE: tropical exotics (coconut, coffee, banana, orange, grapes, papaya) are
# intentionally NOT aliased — they have distinct soil/climate profiles that
# would mislead Pakistani farmers if merged with local crops.
# The model will return "unknown" for these inputs, which is the honest answer.


def resolve_dataset_path() -> Path:
    if DATA_PATH.is_file():
        return DATA_PATH
    alt = DATA_PATH.parent / "Crop_Recommendation.csv"
    if alt.is_file():
        return alt
    raise FileNotFoundError(
        f"Dataset not found at {DATA_PATH}. Run: python datasets/download_dataset.py"
    )


def normalize_label(label: str) -> str:
    key = str(label).strip().lower()
    return PAKISTAN_CROP_ALIASES.get(key, key)


def load_raw_dataframe() -> pd.DataFrame:
    path = resolve_dataset_path()
    df = pd.read_csv(path)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    rename_map = {
        "nitrogen": "N",
        "phosphorus": "P",
        "potassium": "K",
        "temperature": "temperature",
        "humidity": "humidity",
        "ph_value": "ph",
        "rainfall": "rainfall",
        "crop": "label",
    }
    df = df.rename(columns={c: rename_map.get(c, c) for c in df.columns})
    # normalize feature names to lowercase keys then map to FEATURE_COLUMNS
    col_fix = {"n": "N", "p": "P", "k": "K"}
    df = df.rename(columns={c: col_fix.get(c, c) for c in df.columns})
    if "label" not in df.columns and "crop" in df.columns:
        df = df.rename(columns={"crop": "label"})
    required = FEATURE_COLUMNS + ["label"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing columns: {missing}")
    df["label"] = df["label"].map(normalize_label)
    df = df.dropna(subset=FEATURE_COLUMNS + ["label"])
    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=FEATURE_COLUMNS)
    return df


def crop_profiles_from_df(df: pd.DataFrame) -> dict:
    profiles: dict = {}
    for crop, grp in df.groupby("label"):
        profiles[crop] = {
            "N": round(float(grp["N"].median()), 2),
            "P": round(float(grp["P"].median()), 2),
            "K": round(float(grp["K"].median()), 2),
            "ph": round(float(grp["ph"].median()), 2),
            "sample_count": int(len(grp)),
        }
    return profiles


def prepare_training_frame(df: pd.DataFrame):
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df["label"].astype(str))
    X = df[FEATURE_COLUMNS].values.astype(np.float64)
    profiles = crop_profiles_from_df(df)
    return df, X, y, label_encoder, profiles


def fit_scaler(X: np.ndarray) -> StandardScaler:
    scaler = StandardScaler()
    scaler.fit(X)
    return scaler


def save_artifacts(scaler: StandardScaler, label_encoder: LabelEncoder, profiles: dict) -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    joblib.dump(scaler, ARTIFACTS / "scaler.joblib")
    joblib.dump(label_encoder, ARTIFACTS / "label_encoder.joblib")
    (ARTIFACTS / "crop_profiles.json").write_text(
        json.dumps(profiles, indent=2), encoding="utf-8"
    )
    (ARTIFACTS / "feature_columns.json").write_text(
        json.dumps(FEATURE_COLUMNS, indent=2), encoding="utf-8"
    )


def load_artifacts():
    model_path = ARTIFACTS / "model.joblib"
    if not model_path.is_file():
        raise FileNotFoundError(
            "Trained model not found. Run: python ml/train_model.py"
        )
    model = joblib.load(model_path)
    scaler = joblib.load(ARTIFACTS / "scaler.joblib")
    label_encoder = joblib.load(ARTIFACTS / "label_encoder.joblib")
    profiles = json.loads((ARTIFACTS / "crop_profiles.json").read_text(encoding="utf-8"))
    return model, scaler, label_encoder, profiles


def impute_soil_features(
    profiles: dict,
    target_crop: str | None,
    overrides: dict | None = None,
) -> dict:
    overrides = overrides or {}
    crop_key = normalize_label(target_crop or "wheat")
    base = profiles.get(crop_key) or next(iter(profiles.values()), {})
    return {
        "N": float(overrides.get("N", base.get("N", 50))),
        "P": float(overrides.get("P", base.get("P", 35))),
        "K": float(overrides.get("K", base.get("K", 40))),
        "ph": float(overrides.get("ph", base.get("ph", 6.5))),
    }


def build_feature_vector(payload: dict, profiles: dict) -> np.ndarray:
    soil = impute_soil_features(
        profiles,
        payload.get("target_crop"),
        {
            k: payload[k]
            for k in ("N", "P", "K", "ph")
            if k in payload and payload[k] is not None
        },
    )
    row = [
        soil["N"],
        soil["P"],
        soil["K"],
        float(payload["temperature"]),
        float(payload["humidity"]),
        soil["ph"],
        float(payload.get("rainfall", 100.0)),
    ]
    return np.array([row], dtype=np.float64)


def crop_suitability_from_probability(prob: float) -> tuple[str, float]:
    """Convert model confidence into a crop suitability score (0–100).

    FIX: the previous function was called risk_from_probability and inverted
    probability into 'risk' via score = (1 - prob) * 100.  This conflated two
    distinct agricultural concepts:
      • Crop suitability  — how well current conditions match the crop's needs
      • Crop risk         — exposure to weather/pest/market hazards

    The classifier predicts suitability, not risk.  We now return it honestly.
    A high suitability score means conditions are good for this crop.
    """
    score = round(prob * 100, 2)
    if prob >= 0.65:
        level = "high"      # conditions are highly suitable
    elif prob >= 0.35:
        level = "medium"    # conditions are moderately suitable
    else:
        level = "low"       # conditions are poorly suited to this crop
    return level, score


# Backward-compatibility alias so existing callers do not break immediately.
# Deprecate and remove once predict.py and any other callers are updated.
def risk_from_probability(prob: float) -> tuple[str, float]:
    """Deprecated: use crop_suitability_from_probability instead."""
    return crop_suitability_from_probability(prob)
