# AgroInsight — Production Rebuild (FYP)

Pakistan-focused agricultural weather & crop risk platform with **real ML** (offline-trained RandomForest), **live APIs**, foreign keys, rate limiting, and `.env` secrets.

## Folder structure

```
agroinsight/
├── .env.example          → copy to .env (API keys)
├── database/schema.sql   → full DB with FKs, 10 crops, indexes
├── datasets/
│   ├── DATASETS.md
│   ├── download_dataset.py
│   └── crop_recommendation/raw/Crop_recommendation.csv  (after download)
├── ml/
│   ├── train_model.py    → run ONCE to train
│   ├── preprocess.py
│   ├── api/predict.py    → inference only (PHP calls this)
│   ├── requirements.txt
│   └── artifacts/        → model.pkl, metrics.json (after train)
├── Backend/
│   ├── config/           → bootstrap, env, database, constants
│   ├── helpers/          → rate_limit, python_runner (proc_open)
│   └── api/              → REST endpoints
└── Frontend/             → HTML + js/api.js (live fetch)
```

## Setup (XAMPP)

### 1. Install project

Place folder at: `C:\xampp\htdocs\agroinsight\`

### 2. Database

1. Start MySQL in XAMPP.
2. Open phpMyAdmin → Import `database/schema.sql`.
3. Import `database/schema_updates.sql` (reminders, SMS logs, system config).
4. (Optional) Drop old `agroinsight` DB first if upgrading from fake version.

### 3. Environment variables

```bash
copy .env.example .env
```

Edit `.env`:

| Variable | Where to get it |
|----------|-----------------|
| `OPENWEATHER_API_KEY` | https://openweathermap.org/api |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |
| `DB_*` | XAMPP defaults (root, empty password) |

Never commit `.env`.

### 4. Python ML (required once)

```bash
cd C:\xampp\htdocs\agroinsight
python -m venv .venv
.venv\Scripts\activate
pip install -r ml\requirements.txt
python datasets\download_dataset.py
python ml\train_model.py
```

**Dataset sources**

- Mirror: https://raw.githubusercontent.com/nileshely/Crop-Recommendation/main/Crop_Recommendation.csv  
- Kaggle (cite in report): https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset  

**CSV columns** (after download): `Nitrogen, Phosphorus, Potassium, Temperature, Humidity, pH_Value, Rainfall, Crop` — auto-mapped by `preprocess.py`.

**Artifacts produced**

- `ml/artifacts/model.pkl`
- `ml/artifacts/metrics.json`
- `ml/artifacts/feature_importance.json`

### 5. Run app

1. Start Apache + MySQL.
2. Open: http://localhost/agroinsight/Frontend/login.html
3. Register a farmer account, or use seeded admin:
   - Email: `admin@agroinsight.pk`
   - Password: `password` (bcrypt hash in schema; change after import)
   - Admin panel: http://localhost/agroinsight/Frontend/admin/index.html

## What was fixed

| Issue | Fix |
|-------|-----|
| Fake runtime ML | Offline `train_model.py` + inference-only `ml/api/predict.py` |
| Hardcoded analysis.js | `Frontend/js/analysis.js` → `/analytics/get_dashboard.php`, forecast, ML |
| Gemini placeholder | Key in `.env`, validated in `chatbot/chat.php` |
| No FKs | `schema.sql` constraints on predictions, alerts, weather_logs |
| Exposed API keys | `.env` + `env.php` loader |
| shell_exec | `helpers/python_runner.php` uses `proc_open` + timeout |
| Rate limiting | `rate_limits` table + `enforceRateLimit()` |
| Pagination | `get_alerts.php`, `get_users.php`, `get_predictions.php` |
| 4 crops only | 10 crops in schema |
| weather_analysis dead | `weather/history_analysis.php` |
| Contact form | `contact/submit.php` + `contact.js` |
| critical severity | Enum includes `critical` |

## API map (for viva)

| Endpoint | Purpose |
|----------|---------|
| `GET /weather/get_weather.php?city=` | Live weather + log to DB |
| `GET /weather/analyze_crop.php?city=&crop_id=` | ML risk + save prediction |
| `GET /weather/history_analysis.php` | Python trend analysis |
| `GET /analytics/get_dashboard.php` | Analysis page data |
| `GET /analytics/get_model_metrics.php` | Accuracy + feature importance |
| `GET /economics/get_summary.php` | Market prices from DB |
| `POST /chatbot/chat.php` | Gemini proxy |

## Files to delete (old fake versions)

- Old `Frontend/js/analysis.js` if it contained only `const DATA = { ... }` hardcoded object
- `Backend/python/predict_risk.py` (deprecated — kept as stub only)
- `ml/requirements.txt.txt` (duplicate extension)
- `Backend/.htaccess.txt` → use `Backend/.htaccess`

## Demo flow for evaluators

1. Login → Weather dashboard → search **Faisalabad** (creates `weather_logs`).
2. Crop Analysis → select **Wheat** → ML runs via `analyze_crop.php`.
3. Chatbot → ask: “When should I irrigate wheat in Punjab?”
4. phpMyAdmin → show `predictions` row + FK relations on `users` / `crops`.
