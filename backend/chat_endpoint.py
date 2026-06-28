# ─────────────────────────────────────────────────────────────────
# ADD THESE TO YOUR main.py
# ─────────────────────────────────────────────────────────────────

# 1. Add to your imports at the top:
# from chatbot import CHAT_GRAPH
# from collections import defaultdict

# 2. Add this after your app = FastAPI() line:
# session_memory = defaultdict(list)   # user_id -> list of {message, response}

# 3. Add this Pydantic model:
# class ChatRequest(BaseModel):
#     message: str

# 4. Add this endpoint:

"""
COPY FROM HERE ↓


from collections import defaultdict
from chatbot import CHAT_GRAPH

# In-memory session store (clears on server restart — as requested)
session_memory = defaultdict(list)


class ChatRequest(BaseModel):
    message: str


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
    """# Clear session memory for a user"""
    #session_memory[user_id] = []
    #return {"message": "Chat history cleared"}

#COPY TO HERE ↑