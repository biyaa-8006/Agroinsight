# AgroInsight — Agriculture & Weather Impact Analysis Platform

## What it does
AgroInsight helps Pakistani farmers understand how weather
conditions affect their crops. It provides real-time weather
data, ML-based crop risk predictions, AI chat assistance,
economic impact analysis, and disaster alert management.

## Tech Stack
- Frontend: HTML5, CSS3, JavaScript, Chart.js, Lucide Icons
- Backend:  PHP 8.x (REST API, no framework)
- Database: MySQL 8.x
- ML Model: Python 3.x + scikit-learn (Decision Tree)
- AI Chat:  Google Gemini 1.5 Flash (via backend proxy)
- Weather:  OpenWeatherMap API

## Setup Instructions

### 1. Requirements
- XAMPP (Apache + MySQL + PHP 8+)
- Python 3.x with scikit-learn: `pip install scikit-learn`

### 2. Database Setup
1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Create database: agroinsight
3. Import: Database/schema.sql

### 3. API Keys
Open Backend/config/constants.php and set:
- OPENWEATHER_API_KEY — get free key at openweathermap.org
- GEMINI_API_KEY — get free key at aistudio.google.com

### 4. Run the project
1. Place the project folder in: C:/xampp/htdocs/agroinsight/
2. Start Apache and MySQL in XAMPP Control Panel
3. Open: http://localhost/agroinsight/Frontend/login.html

## Features
- User registration and login (bcrypt + PHP sessions)
- Live weather lookup (OpenWeatherMap API)
- ML crop risk analysis (Decision Tree, scikit-learn)
- AI farming assistant (Gemini 1.5 Flash)
- Alert management system
- Economic impact dashboard
- Admin panel (user management + stats)

## Developer
[Your Name] — Final Year Software Engineering Student
[Your University] — [Year]