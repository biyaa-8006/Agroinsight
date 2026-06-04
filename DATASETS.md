# AgroInsight ML Dataset

## Primary source (open mirror — used by `download_dataset.py`)

**URL:** https://raw.githubusercontent.com/nileshely/Crop-Recommendation/main/Crop_Recommendation.csv

## Original Kaggle dataset (cite in FYP report)

**URL:** https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset

**License:** Check Kaggle page before publication; suitable for academic FYP use.

## Local path after download

```
agroinsight/datasets/crop_recommendation/raw/Crop_recommendation.csv
```

## CSV format (header row required)

| Column       | Type   | Description                    |
|-------------|--------|--------------------------------|
| N           | float  | Nitrogen (kg/ha scale)         |
| P           | float  | Phosphorus                     |
| K           | float  | Potassium                      |
| temperature | float  | °C                             |
| humidity    | float  | %                              |
| ph          | float  | Soil pH                        |
| rainfall    | float  | mm                             |
| label       | string | Recommended crop class name    |

Example row:

```csv
N,P,K,temperature,humidity,ph,rainfall,label
90,42,43,20.88,82.27,6.5,202.94,rice
```

## Commands

```bash
cd C:\xampp\htdocs\agroinsight
python -m venv .venv
.venv\Scripts\activate
pip install -r ml/requirements.txt
python datasets/download_dataset.py
python ml/train_model.py
```

Artifacts: `ml/artifacts/model.joblib`, `metrics.json`, `feature_importance.json`
