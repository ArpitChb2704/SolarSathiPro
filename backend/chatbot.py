"""
chatbot.py — LangGraph-powered solar chatbot
"""

import os
from typing import TypedDict, Literal, List, Optional
from groq import Groq
from langgraph.graph import StateGraph, END

# ─────────────────────────────────────────
# STATE
# ─────────────────────────────────────────

class ChatState(TypedDict):
    user_id: int
    message: str
    intent: Optional[Literal["plant_qa", "prediction_qa", "general", "alert_qa"]]
    context: Optional[str]
    response: Optional[str]
    session_history: List[dict]   # in-memory only, not persisted
    # db data
    user: Optional[dict]
    plants: Optional[list]
    predictions: Optional[list]


# ─────────────────────────────────────────
# GROQ CLIENT
# ─────────────────────────────────────────

def get_groq_client():
    return Groq(api_key=os.environ.get("API_KEY"))


def llm(system: str, user: str, history: list = []) -> str:
    client = get_groq_client()
    messages = [{"role": "system", "content": system}]
    # add last 6 history turns for context
    for h in history[-6:]:
        messages.append({"role": "user", "content": h["message"]})
        messages.append({"role": "assistant", "content": h["response"]})
    messages.append({"role": "user", "content": user})

    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=600,
    )
    return resp.choices[0].message.content.strip()


# ─────────────────────────────────────────
# NODE 1 — Intent Router
# ─────────────────────────────────────────

def intent_router(state: ChatState) -> ChatState:
    msg = state["message"].lower()

    plant_keywords    = ["plant", "my system", "solar panel", "capacity", "location", "tilt", "azimuth", "plants"]
    prediction_keywords = ["predict", "today", "actual", "generation", "kwh", "performance", "forecast", "7 day", "annual", "monthly", "how much", "energy today"]
    alert_keywords    = ["alert", "fault", "issue", "problem", "error", "warning", "underperform", "low", "difference"]

    if any(k in msg for k in alert_keywords):
        intent = "alert_qa"
    elif any(k in msg for k in prediction_keywords):
        intent = "prediction_qa"
    elif any(k in msg for k in plant_keywords):
        intent = "plant_qa"
    else:
        intent = "general"

    return {**state, "intent": intent}


# ─────────────────────────────────────────
# NODE 2a — Plant QA
# ─────────────────────────────────────────

def plant_qa_node(state: ChatState) -> ChatState:
    plants = state.get("plants") or []
    user   = state.get("user") or {}

    if not plants:
        return {**state, "context": "no_plants",
                "response": "You don't have any solar plants registered yet. Head to **Add Plant** to get started!"}

    plant_info = "\n".join([
        f"• {p['plant_name']}: {p['capacity_kw']} kW, located at ({p['lat']:.4f}, {p['lon']:.4f}), "
        f"tilt {p['tilt']}°, azimuth {p['azimuth']}°"
        for p in plants
    ])

    system = (
        f"You are SolarAI assistant for {user.get('name','the user')}. "
        "Answer questions about their solar plants using only the data provided. "
        "Be concise, friendly, and avoid technical jargon."
    )
    context = f"User's plants:\n{plant_info}"
    prompt  = f"{context}\n\nUser question: {state['message']}"

    response = llm(system, prompt, state.get("session_history", []))
    return {**state, "context": context, "response": response}


# ─────────────────────────────────────────
# NODE 2b — Prediction QA
# ─────────────────────────────────────────

def prediction_qa_node(state: ChatState) -> ChatState:
    predictions = state.get("predictions") or []
    plants      = state.get("plants") or []
    user        = state.get("user") or {}

    if not plants:
        return {**state, "response": "You have no plants yet. Add a plant first from the **Add Plant** page."}

    if not predictions:
        return {**state, "response": (
            "No prediction data is available yet for your plants. "
            "Please go to the **Dashboard**, open a plant card, and click **Run Prediction** first."
        )}

    # Build prediction context
    pred_lines = []
    for pred in predictions:
        plant = next((p for p in plants if p["id"] == pred["plant_id"]), None)
        name  = plant["plant_name"] if plant else f"Plant #{pred['plant_id']}"
        try:
            diff  = round(float(pred["actual_energy"]) - float(pred["predicted_energy"]), 2)
            diff_str = f"+{diff}" if diff >= 0 else str(diff)
            perf = "above" if diff >= 0 else "below"
        except:
            diff_str, perf = "N/A", "unknown"

        pred_lines.append(
            f"• {name}: actual={pred['actual_energy']} kWh, predicted={pred['predicted_energy']} kWh, "
            f"difference={diff_str} kWh ({perf} prediction), annual forecast={pred['annual_energy']} kWh"
        )

    context = "Latest prediction data:\n" + "\n".join(pred_lines)
    system  = (
        f"You are SolarAI assistant for {user.get('name','the user')}. "
        "Explain solar plant performance data in a clear, encouraging way. "
        "If actual < predicted, suggest possible reasons (clouds, dust, shade). "
        "Keep responses under 120 words."
    )
    prompt = f"{context}\n\nUser question: {state['message']}"

    response = llm(system, prompt, state.get("session_history", []))
    return {**state, "context": context, "response": response}


# ─────────────────────────────────────────
# NODE 2c — Alert / Fault QA
# ─────────────────────────────────────────

def alert_qa_node(state: ChatState) -> ChatState:
    predictions = state.get("predictions") or []
    plants      = state.get("plants") or []
    user        = state.get("user") or {}

    if not predictions:
        return {**state, "response": (
            "No prediction data found to check for faults. "
            "Run a prediction first from the Dashboard."
        )}

    alerts = []
    for pred in predictions:
        plant = next((p for p in plants if p["id"] == pred["plant_id"]), None)
        name  = plant["plant_name"] if plant else f"Plant #{pred['plant_id']}"
        try:
            actual    = float(pred["actual_energy"])
            predicted = float(pred["predicted_energy"])
            diff_pct  = ((actual - predicted) / predicted) * 100 if predicted else 0
            if diff_pct < -10:
                alerts.append(f"• {name} is underperforming by {abs(diff_pct):.1f}% — actual {actual} vs predicted {predicted} kWh")
            elif diff_pct >= 0:
                alerts.append(f"• {name} is performing well (+{diff_pct:.1f}% above prediction)")
        except:
            pass

    if not alerts:
        alert_context = "All plants are performing within normal range."
    else:
        alert_context = "Performance summary:\n" + "\n".join(alerts)

    system = (
        f"You are SolarAI assistant for {user.get('name','the user')}. "
        "Diagnose solar plant performance issues. Suggest practical causes and fixes. "
        "Be concise and actionable. Keep under 130 words."
    )
    prompt = f"{alert_context}\n\nUser question: {state['message']}"

    response = llm(system, prompt, state.get("session_history", []))
    return {**state, "context": alert_context, "response": response}


# ─────────────────────────────────────────
# NODE 2d — General Chat
# ─────────────────────────────────────────

def general_chat_node(state: ChatState) -> ChatState:
    user   = state.get("user") or {}
    system = (
        f"You are SolarAI, a helpful assistant for {user.get('name', 'a solar plant owner')}. "
        "You help with solar energy questions, platform usage, and general queries. "
        "Be friendly, concise, and knowledgeable about solar energy. Under 100 words."
    )
    response = llm(system, state["message"], state.get("session_history", []))
    return {**state, "response": response}


# ─────────────────────────────────────────
# ROUTER FUNCTION
# ─────────────────────────────────────────

def route_intent(state: ChatState) -> str:
    return state.get("intent", "general")


# ─────────────────────────────────────────
# BUILD GRAPH
# ─────────────────────────────────────────

def build_chat_graph():
    graph = StateGraph(ChatState)

    graph.add_node("intent_router",    intent_router)
    graph.add_node("plant_qa",         plant_qa_node)
    graph.add_node("prediction_qa",    prediction_qa_node)
    graph.add_node("alert_qa",         alert_qa_node)
    graph.add_node("general",          general_chat_node)

    graph.set_entry_point("intent_router")

    graph.add_conditional_edges("intent_router", route_intent, {
        "plant_qa":      "plant_qa",
        "prediction_qa": "prediction_qa",
        "alert_qa":      "alert_qa",
        "general":       "general",
    })

    graph.add_edge("plant_qa",      END)
    graph.add_edge("prediction_qa", END)
    graph.add_edge("alert_qa",      END)
    graph.add_edge("general",       END)

    return graph.compile()


CHAT_GRAPH = build_chat_graph()
