import os
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv('backend/.env')
key = os.getenv('GEMINI_API_KEY')
print("API Key loaded:", key[:12] if key else "None")

prompt = """
You are an expert Chief Agronomist and Crop Specialist analyzing satellite remote sensing data for a farmer's field.
FARM & SATELLITE DATA SNAPSHOT (2026-10-15):
1. Mean NDVI: 0.6500, NDRE: 0.4500, EVI: 0.5500, SAVI: 0.5800, NDBI: -0.2000
2. Healthy Green: 80%, Moderate Yellow: 15%, Damaged Red: 5%
3. Problem Area: 0.50 acres (5.0%)
4. Growth: RAPID_GROWTH (+12.0%)
5. Weather: 28.0°C, 65% RH, 20mm rain
6. ML Score: 88.0/100 (HEALTHY_CROPS)

TASK:
Return strictly a valid JSON object matching this structure:
{
  "model_used": "gemini-3.5-flash-lite",
  "executive_summary": {
    "headline": "Optimal Canopy Growth with Balanced Soil Moisture",
    "overall_health_grade": "A+",
    "farmer_friendly_message": "Your crops are in strong vegetative condition."
  },
  "categories": [
    {
      "id": "irrigation",
      "icon": "💧",
      "title": "Irrigation & Water Management Strategy",
      "status": "OPTIMAL",
      "summary": "Soil moisture is well balanced.",
      "specific_actions": ["Maintain current 3-day cycle"],
      "metrics_correlation": "SAVI 0.58"
    }
  ],
  "action_plan": {
    "immediate_24_48h": [{"priority": "HIGH", "action": "Routine inspection", "reason": "Ensure no weed pressure"}],
    "short_term_3_7d": [{"priority": "MEDIUM", "action": "Foliar zinc spray", "reason": "Promote tillering"}],
    "maintenance_8_14d": []
  },
  "yield_impact": {
    "risk_if_no_action": "Minor localized yield drag",
    "potential_gain_with_action": "5-8% yield boost",
    "estimated_recovery_days": 5
  }
}
"""

models = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.5-flash"
]

for model_name in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json"
        }
    }
    t0 = time.time()
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=15)
        print(f"[{model_name}] status: {r.status_code}, time: {time.time()-t0:.2f}s")
        if r.status_code == 200:
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text)
            print(f"SUCCESS with {model_name}!")
            print("Headline:", parsed.get("executive_summary", {}).get("headline"))
            break
        else:
            print(f"FAILED {model_name}: {r.text[:200]}")
    except Exception as e:
        print(f"EXCEPTION {model_name}: {e}")
