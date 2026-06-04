"""
DEPRECATED — do not use for inference.
Use ml/train_model.py + ml/api/predict.py instead.
"""
import json
import sys

print(json.dumps({
    "error": (
        "predict_risk.py is deprecated. Train with ml/train_model.py and "
        "infer via ml/api/predict.py (see datasets/DATASETS.md)."
    )
}))
sys.exit(1)