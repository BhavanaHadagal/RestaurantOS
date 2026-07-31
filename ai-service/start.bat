@echo off
echo Starting RestaurantOS AI Service on http://localhost:8000
cd /d "%~dp0"
uvicorn app.main:app --host 0.0.0.0 --port 8000
