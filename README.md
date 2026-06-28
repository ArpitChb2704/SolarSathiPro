# ☀️ SolarSathi – AI Powered Solar Plant Monitoring & Prediction Platform

SolarSathi is an AI-powered solar plant monitoring and analytics platform that helps users track, analyze, and predict solar energy generation. The platform provides plant performance insights, energy forecasting, environmental impact metrics, and AI chatbot support for plant-related queries.

**Live Demo:** https://solarsathi.online

---

## 🚀 Features

### 📊 Solar Energy Prediction
- Predict daily and annual solar energy generation
- Monthly energy generation analytics
- Ideal vs Actual energy comparison
- Performance ratio calculation

### 🌤 Solar Simulation & Analytics
- Solar plant simulation using:
  - Latitude & Longitude
  - Capacity (kW)
  - Tilt angle
  - Azimuth angle

- Environmental metrics:
  - CO₂ reduction estimation
  - Trees equivalent
  - Sustainability insights

### 🤖 AI Chat Assistant
SolarSathi includes an AI-powered chatbot that:

- Answers user questions
- Provides plant-specific insights
- Retrieves data from database
- Guides users when predictions are unavailable
- Supports general solar-related queries

### 📈 Dashboard & Visualization
- Monthly energy charts
- Performance monitoring
- Historical analysis
- Interactive UI

### 🔐 Authentication & User Management
- User registration & login
- Plant management
- Prediction history storage

---

## 🏗 Architecture

```text
Frontend (React + JavaScript)
            ↓
        FastAPI Backend
            ↓
 PostgreSQL / Database Layer
            ↓
 Solar Prediction Engine
            ↓
 AI Assistant Layer
```

---

## 🛠 Tech Stack

### Frontend
- React.js
- JavaScript
- HTML
- CSS

### Backend
- FastAPI
- Python

### AI / Data
- Pandas
- NumPy
- Solar simulation models
- AI integrations

### Database
- PostgreSQL

### Deployment
- Railway
- Custom Domain

---

## 📂 Project Structure

```bash
SolarSathi/

frontend/
│── src/
│── components/
│── pages/

backend/
│── app/
│── routes/
│── models/
│── services/
│── prediction/
│── chatbot/

database/

README.md
requirements.txt
```

---

## ⚙️ Installation

### Clone repository

```bash
git clone https://github.com/ArpitChb2704/SolarSathi.git

cd SolarSathi
```

---

## Backend Setup

Create virtual environment:

```bash
python -m venv venv
```

Activate:

Windows:

```bash
venv\Scripts\activate
```

Mac/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run backend:

```bash
uvicorn app.main:app --reload
```

Backend runs at:

```txt
http://localhost:8000
```

---

## Frontend Setup

Go to frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run:

```bash
npm run dev
```

Frontend:

```txt
http://localhost:5173
```

---

## Example Prediction Output

```json
{
    "annual_energy_kwh": 5656.66,

    "monthly_energy_kwh": {
        "Jan":295.68,
        "Feb":541.85,
        "Mar":543.13,
        "Apr":603.78
    },

    "performance_ratio": 0.87
}
```

---

## Future Enhancements

- LLM + LangChain integration
- Plant document upload support
- PDF report generation
- Historical prediction comparison
- Multi-plant management
- RAG based solar assistant
- Real-time weather integration

---

## Screenshots

Add screenshots here:


<img width="2878" height="1624" alt="image" src="https://github.com/user-attachments/assets/efbb5033-e570-46d9-a871-fa1eea41d9ba" />

<img width="1600" height="999" alt="image" src="https://github.com/user-attachments/assets/43ed062b-ec4e-4c14-a5ec-cc70725573fe" />

<img width="1280" height="720" alt="image" src="https://github.com/user-attachments/assets/3fb0e8a7-3089-411f-ac04-10576309a1de" />

<img width="1600" height="913" alt="image" src="https://github.com/user-attachments/assets/eb69a405-7f43-46ec-95c7-9365cf3d53fc" />




---

## Deployment

Frontend and backend deployed with custom domain support:

🌐 https://solarsathi.online

---

## Author

**Arpit Chhabra**

GitHub:
https://github.com/ArpitChb2704


---

## License

This project is developed for educational, research, and portfolio purposes.
