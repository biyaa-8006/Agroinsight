@echo off
cd /d "%~dp0"
echo Installing Python deps...
python -m pip install -r ml\requirements.txt
echo Downloading dataset...
python datasets\download_dataset.py
echo Training model (offline)...
python ml\train_model.py
echo Done. Artifacts in ml\artifacts\
pause
