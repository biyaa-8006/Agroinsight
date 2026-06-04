"""
Download Crop Recommendation CSV into datasets/crop_recommendation/raw/

Source: https://raw.githubusercontent.com/nileshely/Crop-Recommendation/main/Crop_Recommendation.csv
Kaggle: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset
"""
from __future__ import annotations

import urllib.request
from pathlib import Path

URL = (
    "https://raw.githubusercontent.com/nileshely/Crop-Recommendation/"
    "main/Crop_Recommendation.csv"
)
OUT = Path(__file__).resolve().parent / "crop_recommendation" / "raw" / "Crop_recommendation.csv"


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading → {OUT}")
    urllib.request.urlretrieve(URL, OUT)
    lines = sum(1 for _ in OUT.open(encoding="utf-8"))
    print(f"Done. {lines} lines.")


if __name__ == "__main__":
    main()
