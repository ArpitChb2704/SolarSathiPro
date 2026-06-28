from py_compile import main
from fastapi import FastAPI
from fastapi import Depends
from fastapi import HTTPException
from datetime import datetime

from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base
from database import engine
from database import get_db

from models import User
from models import Plant
from models import Prediction

from schemas import UserSignup
from schemas import UserLogin
from schemas import PlantCreate

from utils import hash_password
from utils import verify_password

from auth import create_access_token

from inverter_simulation import simulate_inverter_generation
from solar_engine import run_simulation
from forecast import generate_7day_forecast
from solar_prediction import  predict_daily_generation
import os
from groq import Groq
from emailing import send_report_email
from datetime import datetime
import dotenv
from chatbot import CHAT_GRAPH
from collections import defaultdict
import base64
from fastapi.middleware.cors import CORSMiddleware

session_memory = defaultdict(list)

dotenv.load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://solarsathi.online",
        "https://www.solarsathi.online",
        "https://frontend-production-77de.up.railway.app",  # your vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
        message: str


# To run the server, use:
# uvicorn app:app --reload
# =====================================================
# SIGNUP
# =====================================================

@app.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    new_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully"
    }
# =====================================================
# LOGIN
# =====================================================

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email"
        )

    if not verify_password(
        user.password,
        db_user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )

    token = create_access_token(
        {
            "user_id": db_user.id
        }
    )

    return {
        "access_token": token,
        "user_id": db_user.id
    }


# GET USER PLANTS
# =====================================================

@app.get("/plants/{user_id}")
def get_plants(user_id: int, db: Session = Depends(get_db)):

    plants = db.query(Plant).filter(
        Plant.user_id == user_id
    ).all()

    return plants


# =====================================================
# RUN PREDICTION
# =====================================================

@app.post("/predict/{plant_id}")

def predict(
    plant_id: int,
    db: Session = Depends(get_db)
):

    plant = db.query(Plant).filter(
        Plant.id == plant_id
    ).first()

    if not plant:
        raise HTTPException(
            status_code=404,
            detail="Plant not found"
        )

    # =========================================
    # FORECAST / PVWATTS SIMULATION
    # =========================================

    result = run_simulation(
        lat=plant.lat,
        lon=plant.lon,
        system_size_kw=plant.capacity_kw,
        tilt=plant.tilt,
        azimuth=plant.azimuth,
        losses=[1,2,2,1],
        shading_factor=0.97
    )

    # =========================================
    # REALISTIC INVERTER SIMULATION
    # =========================================

    inverter_result = simulate_inverter_generation(
        lat=plant.lat,
        lon=plant.lon,
        capacity_kw=plant.capacity_kw,
        tilt=plant.tilt,
        azimuth=plant.azimuth
    )

    daily_result = predict_daily_generation(
        lat=plant.lat,
        lon=plant.lon,
        capacity_kw=plant.capacity_kw,
        tilt=plant.tilt,
        azimuth=plant.azimuth
    )

    # =========================================
    # ADD ACTUAL + PREDICTED ENERGY
    # =========================================

    result["predicted_daily_energy_kwh"] = float(
        daily_result.get("daily_energy_kwh", 0)
    )

    result["actual_daily_energy_kwh"] = float(
        inverter_result.get(
            "actual_daily_energy_kwh",
            0
        )
    )

    inverter_result["performance_ratio"] = float(
        inverter_result.get(
            "performance_ratio",
            0.95
        )
    )

    result["hourly_generation"] = inverter_result.get(
        "hourly_generation",
        []
    )

    # =========================================
    # MONTH MAPPING
    # =========================================

    month_map = {
        1: "Jan",
        2: "Feb",
        3: "Mar",
        4: "Apr",
        5: "May",
        6: "Jun",
        7: "Jul",
        8: "Aug",
        9: "Sep",
        10: "Oct",
        11: "Nov",
        12: "Dec"
    }

    current_month = datetime.now().month

    month_name = month_map[current_month]

    monthly_energy = result[
        "monthly_energy_kwh"
    ][month_name]

    # =========================================
    # 7 DAY FORECAST
    # =========================================

    if monthly_energy == 0:

        forecast = []

    else:

        forecast = generate_7day_forecast(
            plant.lat,
            plant.lon,
            monthly_energy
        )

    result["forecast_7_days"] = forecast

    # =========================================
    # SAVE TO DATABASE
    # =========================================

    predicted_energy = float(
        result.get(
            "predicted_daily_energy_kwh",
            0
        )
    )

    actual_energy = float(
        result.get(
            "actual_daily_energy_kwh",
            0
        )
    )

    prediction = Prediction(

        plant_id=plant.id,

        predicted_energy=predicted_energy,

        actual_energy=actual_energy,

        performance_ratio=float(
            result.get(
                "performance_ratio",
                0.95
            )
        ),

        forecast_7_days=forecast,

        monthly_energy=result.get(
            "monthly_energy_kwh",
            {}
        ),

        annual_energy=float(
            result["annual_energy_kwh"]
        )
    )

    db.add(prediction)

    db.commit()

    return result

# =====================================================
# HISTORY
# =====================================================

@app.get("/history/{plant_id}")
def history(plant_id: int, db: Session = Depends(get_db)):

    data = db.query(Prediction).filter(
        Prediction.plant_id == plant_id
    ).all()

    return data


# =====================================================
# ADD PLANT
# =====================================================

@app.post("/add-plant/{user_id}")
def add_plant(
    user_id: int,
    plant: PlantCreate,
    db: Session = Depends(get_db)
):

    new_plant = Plant(
        user_id=user_id,
        plant_name=plant.plant_name,
        lat=plant.lat,
        lon=plant.lon,
        capacity_kw=plant.capacity_kw,
        tilt=plant.tilt,
        azimuth=plant.azimuth
    )

    db.add(new_plant)
    db.commit()
    db.refresh(new_plant)

    return {
        "message": "Plant added successfully"
    }

@app.get("/user/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": str(user.created_at)
    }

# =====================================================
# CHATBOT
# =====================================================

@app.post("/chat/{user_id}")
async def chat(user_id: int, req: ChatRequest, db: Session = Depends(get_db)):

    # Fetch user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch plants
    plants = db.query(Plant).filter(Plant.user_id == user_id).all()
    plants_data = [
        {
            "id":           p.id,
            "plant_name":   p.plant_name,
            "capacity_kw":  p.capacity_kw,
            "lat":          p.lat,
            "lon":          p.lon,
            "tilt":         p.tilt,
            "azimuth":      p.azimuth,
        }
        for p in plants
    ]

    # Fetch latest prediction per plant
    predictions_data = []
    for plant in plants:
        pred = (
            db.query(Prediction)
            .filter(Prediction.plant_id == plant.id)
            .order_by(Prediction.id.desc())
            .first()
        )
        if pred:
            predictions_data.append({
                "plant_id":        plant.id,
                "actual_energy":   pred.actual_energy,
                "predicted_energy": pred.predicted_energy,
                "annual_energy":   pred.annual_energy,
                "monthly_energy":  pred.monthly_energy,
            })

    # Get session history (in-memory)
    history = session_memory[user_id]

    # Run LangGraph
    result = CHAT_GRAPH.invoke({
        "user_id":        user_id,
        "message":        req.message,
        "intent":         None,
        "context":        None,
        "response":       None,
        "session_history": history,
        "user":           {"id": user.id, "name": user.name, "email": user.email},
        "plants":         plants_data,
        "predictions":    predictions_data,
    })

    response_text = result.get("response", "Sorry, I couldn't process that.")
    intent        = result.get("intent", "general")

    # Save to in-memory session (not DB — session only as requested)
    session_memory[user_id].append({
        "message":  req.message,
        "response": response_text,
    })

    # Keep only last 20 turns in memory
    if len(session_memory[user_id]) > 20:
        session_memory[user_id] = session_memory[user_id][-20:]

    return {
        "response": response_text,
        "intent":   intent,
    }


@app.delete("/chat/{user_id}/clear")
async def clear_chat(user_id: int):
    """Clear session memory for a user"""
    session_memory[user_id] = []
    return {"message": "Chat history cleared"}



# =====================================================
# SEND DAILY REPORT
# =====================================================

API_KEY = os.environ.get("API_KEY")
if not API_KEY:
    raise RuntimeError("API_KEY environment variable is not set. Please set it in your environment or .env file.")
os.environ["GOOGLE_API_KEY"] = API_KEY

@app.post("/send-report/{user_id}")
async def send_report(user_id: int, db: Session = Depends(get_db)):

    # 1. Fetch user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plants = db.query(Plant).filter(Plant.user_id == user_id).all()
    if not plants:
        raise HTTPException(status_code=404, detail="No plants found for this user")

    # 2. Fetch prediction data for each plant
    all_plant_data = []
    for plant in plants:
        try:
            # Get the latest prediction for this plant
            pred_obj = db.query(Prediction).filter(Prediction.plant_id == plant.id).order_by(Prediction.id.desc()).first()
            if pred_obj:
                pred = {
                    "actual_daily_energy_kwh": pred_obj.actual_energy,
                    "predicted_daily_energy_kwh": pred_obj.predicted_energy,
                    "annual_energy_kwh": pred_obj.annual_energy,
                    "monthly_energy_kwh": pred_obj.monthly_energy,
                    "forecast_7_days": pred_obj.forecast_7_days,
                }
            else:
                pred = {}
            all_plant_data.append({
                "plant_name": plant.plant_name,
                "capacity_kw": plant.capacity_kw,
                "location": f"{plant.lat:.4f}, {plant.lon:.4f}",
                "actual_kwh": round(pred.get("actual_daily_energy_kwh", 0), 2) if pred.get("actual_daily_energy_kwh") is not None else "N/A",
                "predicted_kwh": round(pred.get("predicted_daily_energy_kwh", 0), 2) if pred.get("predicted_daily_energy_kwh") is not None else "N/A",
                "annual_kwh": round(pred.get("annual_energy_kwh", 0), 2) if pred.get("annual_energy_kwh") is not None else "N/A",
                "monthly": {k: round(v, 2) for k, v in pred.get("monthly_energy_kwh", {}).items()} if pred.get("monthly_energy_kwh") else {},
                "forecast_7": pred.get("forecast_7_days", []),
            })
        except Exception as e:
            all_plant_data.append({
                "plant_name": plant.plant_name,
                "capacity_kw": plant.capacity_kw,
                "error": str(e)
            })

    # 3. Build summary string for Groq
    plant_summary = ""
    for p in all_plant_data:
        if "error" in p:
            plant_summary += f"\n- {p['plant_name']} ({p['capacity_kw']} kW): prediction failed — {p['error']}"
        else:
            monthly_str = ", ".join([f"{m}: {v:.1f}" for m, v in p['monthly'].items()]) if p['monthly'] else "N/A"
            plant_summary += f"""
            - Plant: {p['plant_name']}
            Capacity: {p['capacity_kw']} kW
            Location: {p['location']}
            Today Actual: {p['actual_kwh']} kWh
            Today Predicted: {p['predicted_kwh']} kWh
            Annual Forecast: {p['annual_kwh']} kWh
            Monthly Breakdown: {monthly_str}
            """

    # 4. Generate AI explanation with Groq
    model = Groq(api_key=API_KEY)
    prompt=f"""You are a helpful assistant for solar plant owners. Based on the following plant data, provide a concise analysis of how the plants are performing, any trends you notice, and actionable insights for the owner.
    {plant_summary}. Summarize in 5 points, be encouraging, and avoid technical jargon. Give reason for possible difference in today's actual vs predicted energy, and suggest one actionable tip for improving performance.
    Additionally, provide one point for describing today's weather conditions and how it may have impacted performance. Keep it concise, non-technical, and encouraging.
    """
    groq_response = model.chat.completions.create( messages=[
        {
            "role": "user",
            "content": prompt,
        }
    ],
    model="llama-3.3-70b-versatile",
    )
    ai_explanation = groq_response.choices[0].message.content if groq_response and groq_response.choices else "No AI explanation available."
    ai_explanation = ai_explanation.replace("*", "")  # remove any bullet points for cleaner email formatting
    # 5. Build HTML email
    date_str = datetime.now().strftime("%B %d, %Y")

    try:
                diff = round(float(p['actual_kwh']) - float(p['predicted_kwh']), 2)
                diff_color = "#34d399" if diff >= 0 else "#ff6b6b"
                diff_sign = "+" if diff >= 0 else ""
                diff_html = f'<span style="color:{diff_color};font-weight:700;">{diff_sign}{diff} kWh</span>'
    except:
                diff_html = '<span style="color:#888;">N/A</span>'

    # Encode logo image as base64 to embed in email
    logo_path = "logo1.png"
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as f:
            logo_b64 = base64.b64encode(f.read()).decode()
        logo_data_url = f"data:image/png;base64,{logo_b64}"
    else:
        logo_data_url = ""  # or use a placeholder image URL if desired

    plant_cards_html = ""
    for p in all_plant_data:
        if "error" in p:
            plant_cards_html += f"""
            <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin-bottom:16px;">
                <h3 style="color:#f5c842;margin:0 0 8px;">{p['plant_name']}</h3>
                <p style="color:#ff6b6b;margin:0;">⚠ Prediction unavailable</p>
            </div>"""
        else:
            monthly_rows = ""
            if p['monthly']:
                items = list(p['monthly'].items())
                for i in range(0, len(items), 2):
                    row = ""
                    for j in range(2):
                        if i + j < len(items):
                            m, v = items[i + j]
                            row += f'<td style="padding:6px 10px;color:#ccc;">{m}</td><td style="padding:6px 10px;color:#f5c842;font-weight:600;">{v:.1f} kWh</td>'
                    monthly_rows += f"<tr>{row}</tr>"
            else:
                monthly_rows = "<tr><td colspan='4' style='color:#888;padding:8px;'>No monthly data</td></tr>"

            plant_cards_html += f"""
            <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-left:4px solid #f5c842;border-radius:12px;padding:24px;margin-bottom:20px;">
                <h3 style="color:#f5c842;margin:0 0 20px;font-size:18px;">🔆 {p['plant_name']}</h3>

                <!-- Row 1: Capacity + Annual -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                    <div style="background:#111;border-radius:8px;padding:14px;text-align:center;">
                        <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Capacity</div>
                        <div style="color:#fff;font-size:22px;font-weight:700;">{p['capacity_kw']}<span style="font-size:13px;color:#888;"> kW</span></div>
                    </div>
                    <div style="background:#111;border-radius:8px;padding:14px;text-align:center;">
                        <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Annual Forecast</div>
                        <div style="color:#34d399;font-size:22px;font-weight:700;">{p['annual_kwh']}<span style="font-size:13px;color:#888;"> kWh</span></div>
                    </div>
                </div>

                <!-- Row 2: Actual + Predicted + Difference -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:0;">
                    <div style="background:#111;border-radius:8px;padding:14px;text-align:center;">
                        <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Today Actual</div>
                        <div style="color:#f5c842;font-size:20px;font-weight:700;">{p['actual_kwh']}<span style="font-size:12px;color:#888;"> kWh</span></div>
                    </div>
                    <div style="background:#111;border-radius:8px;padding:14px;text-align:center;">
                        <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Today Predicted</div>
                        <div style="color:#fff;font-size:20px;font-weight:700;">{p['predicted_kwh']}<span style="font-size:12px;color:#888;"> kWh</span></div>
                    </div>
                    <div style="background:#111;border-radius:8px;padding:14px;text-align:center;">
                        <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Difference</div>
                        <div style="font-size:20px;font-weight:700;">{diff_html}</div>
                    </div>
                </div>
            </div>"""

    html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a0a,#0a0a0a);border:1px solid #2a2a2a;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:12px;"><img src="{logo_data_url}" alt="Logo" height="120" width="120" style="border-radius:12px;"/></div>
      <h1 style="color:#f5c842;font-size:28px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px;">SolarSathi Report</h1>
      <p style="color:#888;margin:0;font-size:14px;">{date_str}</p>
    </div>

     <!-- Plant Data -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#fff;font-size:16px;font-weight:600;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;">📊 Plant Details</h2>
      {plant_cards_html}
    </div>

    <!-- AI Explanation -->
    <div style="background:#111;border:1px solid #222;border-radius:16px;padding:28px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:20px;">🤖</span>
        <span style="color:#f5c842;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">AI Analysis</span>
      </div>
      <p style="color:#ddd;line-height:1.8;margin:0;font-size:15px;white-space:pre-line;">{ai_explanation}</p>
    </div>
    
    <!-- Footer -->
    <div style="text-align:center;padding:24px;border-top:1px solid #1a1a1a;">
      <p style="color:#444;font-size:12px;margin:0;">Generated by SolarSathi · {date_str}</p>
      <p style="color:#444;font-size:12px;margin:4px 0 0;">This report was automatically generated based on your plant data.</p>
    </div>

  </div>
</body>
</html>"""

    # 6. Send email
    success = send_report_email(
        to=user.email,
        user_name=user.name,
        html_body=html_body
    )

    if success:
        return {"message": f"Report sent to {user.email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")
