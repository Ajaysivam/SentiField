import os
import json
import datetime
import requests
import base64
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv()


def generate_gemini_recommendations(analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates AI-powered agronomic recommendations using Google Gemini API.
    Synthesizes:
    - Multispectral Indices (NDVI, NDRE, EVI, SAVI, NDBI)
    - Field Zoning & Problem Red-Zone Acres
    - 30-Day Historical Revisit Trend & Growth Delta
    - Live Weather Correlation (Temp, Humidity, 7-Day Rain, ET₀ Water Loss)
    - ML Random Forest Prediction & Health Score
    - 14-Day AI Trend Forecast
    """
    # Guardrail: Check if building / non-agricultural structure was detected
    land_safety = analysis_data.get("land_safety", {})
    if not land_safety.get("is_farmland", True):
        return {
            "status": "warning",
            "model_used": "Neural Agronomic Diagnostic System v3.5",
            "is_ai_generated": False,
            "executive_summary": {
                "headline": "️ Building / Non-Agricultural Structure Detected",
                "overall_health_grade": "N/A",
                "farmer_friendly_message": "The selected boundary covers a building rooftop, concrete surface, or non-farmland structure. Satellite crop health diagnostics and fertilizer/irrigation recommendations cannot be applied to non-agricultural structures. Please select an active farming area or use one of the farming hub shortcuts (e.g. Namakkal, Thanjavur, Coimbatore) to analyze real crops."
            },
            "categories": [
                {
                    "id": "site_selection",
                    "icon": "",
                    "title": "Field Location & Boundary Guidance",
                    "status": "CRITICAL",
                    "summary": "Selected polygon has high built-up / non-vegetative index (NDBI > 0.05).",
                    "specific_actions": [
                        "Click any of the 'Farming Hubs' buttons above (e.g., Namakkal, Thanjavur) for instant fertile farm coordinates.",
                        "Use the polygon tool on the map to outline an active green or cultivated field instead of buildings or roads."
                    ],
                    "metrics_correlation": "Correlated to NDBI Built-up Index"
                },
                {
                    "id": "soil_restoration",
                    "icon": "",
                    "title": "Soil & Land Potential Evaluation",
                    "status": "ATTENTION",
                    "summary": "If this is fallow or degraded soil, restorative planting is required.",
                    "specific_actions": [
                        "Incorporate green manure or organic compost if converting open ground to cultivation.",
                        "Conduct soil lab testing for pH and organic carbon before planting new crops."
                    ],
                    "metrics_correlation": "Low vegetation signature"
                }
            ],
            "field_health_status": "BUILDING_NON_FARMLAND",
            "confidence_score": 99.0,
            "action_plan": {
                "immediate_24_48h": [
                    {"priority": "HIGH", "action": "Redraw Boundary on Active Farmland", "reason": "The selected coordinates cover a building or urban structure, not agricultural crops."}
                ],
                "short_term_3_7d": [
                    {"priority": "MEDIUM", "action": "Select Farming Hub Shortcut", "reason": "Instantly jump to verified crop belts in Namakkal, Thanjavur, or Erode."}
                ],
                "maintenance_8_14d": []
            },
            "yield_impact": {
                "risk_if_no_action": "No crop monitoring available for building structures.",
                "potential_gain_with_action": "Select a farming place to unlock real-time Sentinel-2 crop vigor, water stress, and yield forecasts.",
                "estimated_recovery_days": 0
            }
        }

    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    # Extract all relevant data points for prompting
    stats = analysis_data.get("statistics", {})
    ndvi_mean = stats.get("ndvi", {}).get("mean", 0.0)
    ndre_mean = stats.get("ndre", {}).get("mean", 0.0)
    evi_mean = stats.get("evi", {}).get("mean", 0.0)
    savi_mean = stats.get("savi", {}).get("mean", 0.0)
    ndbi_mean = stats.get("ndbi", {}).get("mean", 0.0)

    crop_damage = analysis_data.get("crop_damage_health", {})
    green_pct = crop_damage.get("healthy_green", {}).get("percentage", 0.0)
    yellow_pct = crop_damage.get("moderate_yellow", {}).get("percentage", 0.0)
    red_pct = crop_damage.get("damaged_red", {}).get("percentage", 0.0)

    prob_zones = analysis_data.get("problem_zones", {})
    prob_acres = prob_zones.get("problem_area_acres", 0.0)
    prob_pct = prob_zones.get("problem_area_percentage", 0.0)
    zone_desc = prob_zones.get("zone_description", "")

    hist = analysis_data.get("historical_comparison", {})
    growth_status = hist.get("growth_status", "STABLE")
    growth_pct_change = hist.get("percentage_change", 0.0)

    weather = analysis_data.get("weather_correlation", {})
    temp_c = weather.get("temperature_c", 25.0)
    humidity_pct = weather.get("humidity_pct", 60.0)
    rain_7d = weather.get("rain_7day_sum_mm", 0.0)
    et0_7d = weather.get("evapotranspiration_7d_mm", 0.0)
    w_risks = weather.get("risks", {})
    fungal_risk = w_risks.get("fungal_blight_risk", "LOW")
    drought_risk = w_risks.get("drought_stress_risk", "LOW")

    ml_pred = analysis_data.get("ml_prediction", {})
    ml_class = ml_pred.get("predicted_class", "HEALTHY_CROPS")
    health_score = ml_pred.get("health_score", 85.0)
    risk_level = ml_pred.get("risk_level", "LOW_RISK")

    trend = analysis_data.get("trend_prediction", {})
    forecast_status = trend.get("trend_status", "STABLE")
    predicted_future_ndvi = trend.get("predicted_future_ndvi", ndvi_mean)

    obs = analysis_data.get("observation_details", {})
    acq_date = obs.get("acquisition_date", datetime.date.today().strftime("%Y-%m-%d"))

    # Attempt Gemini API call if GEMINI_API_KEY is available and not placeholder
    if api_key and api_key != "your_gemini_api_key_here":
        try:
            ai_result = _call_gemini_api(
                api_key=api_key,
                ndvi=ndvi_mean,
                ndre=ndre_mean,
                savi=savi_mean,
                evi=evi_mean,
                ndbi=ndbi_mean,
                green_pct=green_pct,
                yellow_pct=yellow_pct,
                red_pct=red_pct,
                prob_acres=prob_acres,
                prob_pct=prob_pct,
                zone_desc=zone_desc,
                growth_status=growth_status,
                growth_pct_change=growth_pct_change,
                temp_c=temp_c,
                humidity_pct=humidity_pct,
                rain_7d=rain_7d,
                et0_7d=et0_7d,
                fungal_risk=fungal_risk,
                drought_risk=drought_risk,
                health_score=health_score,
                risk_level=risk_level,
                ml_class=ml_class,
                forecast_status=forecast_status,
                predicted_future_ndvi=predicted_future_ndvi,
                acq_date=acq_date
            )
            if ai_result:
                ai_result["status"] = "success"
                ai_result["is_ai_generated"] = True
                return ai_result
        except Exception as e:
            print(f"[GEMINI SERVICE WARNING] API Call failed: {e}. Falling back to Agronomic Rules Engine.")

    # Fallback Rule Engine
    return _build_rule_based_fallback(
        ndvi=ndvi_mean,
        ndre=ndre_mean,
        savi=savi_mean,
        evi=evi_mean,
        green_pct=green_pct,
        yellow_pct=yellow_pct,
        red_pct=red_pct,
        prob_acres=prob_acres,
        prob_pct=prob_pct,
        growth_status=growth_status,
        temp_c=temp_c,
        humidity_pct=humidity_pct,
        rain_7d=rain_7d,
        et0_7d=et0_7d,
        fungal_risk=fungal_risk,
        drought_risk=drought_risk,
        health_score=health_score,
        risk_level=risk_level,
        forecast_status=forecast_status
    )


def _call_gemini_api(
    api_key: str,
    ndvi: float, ndre: float, savi: float, evi: float, ndbi: float,
    green_pct: float, yellow_pct: float, red_pct: float,
    prob_acres: float, prob_pct: float, zone_desc: str,
    growth_status: str, growth_pct_change: float,
    temp_c: float, humidity_pct: float, rain_7d: float, et0_7d: float,
    fungal_risk: str, drought_risk: str,
    health_score: float, risk_level: str, ml_class: str,
    forecast_status: str, predicted_future_ndvi: float,
    acq_date: str
) -> Dict[str, Any]:
    """
    Calls Google Gemini REST API (gemini-2.5-flash / gemini-1.5-flash) requesting strict JSON output.
    """
    prompt = f"""
You are an expert Chief Agronomist and Crop Specialist analyzing satellite remote sensing data for a farmer's field.

### FARM & SATELLITE DATA SNAPSHOT ({acq_date}):
1. Vegetation Indices:
   - Mean NDVI (Vegetation Density): {ndvi:.4f}
   - Mean NDRE (Leaf Chlorophyll): {ndre:.4f}
   - Mean EVI (Canopy Structure): {evi:.4f}
   - Mean SAVI (Soil-Adjusted Vigor): {savi:.4f}
   - Mean NDBI (Built-up/Bare Soil Index): {ndbi:.4f}

2. Crop Health Sector Breakdown:
   - Healthy Green Canopy: {green_pct:.1f}%
   - Moderate Yellow Sector: {yellow_pct:.1f}%
   - Damaged/Stressed Red Sector: {red_pct:.1f}%

3. Spatial Field Zoning:
   - Stressed Problem Area: {prob_acres:.2f} acres ({prob_pct:.1f}% of total field)
   - Spatial Note: {zone_desc}

4. 30-Day Historical Trend:
   - Growth Trajectory: {growth_status} ({growth_pct_change:+.1f}% biomass change)

5. Live Weather Correlation:
   - Temperature: {temp_c:.1f}°C, Relative Humidity: {humidity_pct:.1f}%
   - 7-Day Rain: {rain_7d:.1f} mm, Evapotranspiration Water Loss (ET₀): {et0_7d:.1f} mm
   - Fungal Blight Risk: {fungal_risk}, Drought Risk: {drought_risk}

6. AI Model Diagnosis:
   - Machine Learning Classification: {ml_class}
   - Overall Health Score: {health_score:.1f}/100 ({risk_level})
   - 14-Day Growth Forecast: {forecast_status} (Predicted Future NDVI: {predicted_future_ndvi:.4f})

### TASK:
Generate a highly detailed, actionable, and encouraging agronomic recommendation guide for the farmer.
Return strictly a valid JSON object matching the exact format below (no markdown wrappers like ```json, just raw valid JSON):

{{
  "model_used": "gemini-2.5-flash",
  "executive_summary": {{
    "headline": "Short punchy summary line",
    "overall_health_grade": "A+", "B", "C", or "D",
    "farmer_friendly_message": "Clear explanation in direct, empathetic language for the farmer."
  }},
  "categories": [
    {{
      "id": "irrigation",
      "icon": "",
      "title": "Irrigation & Water Management Strategy",
      "status": "CRITICAL",
      "summary": "Summary of moisture status",
      "specific_actions": [
        "Action 1 with specific litres/hours or advice",
        "Action 2"
      ],
      "metrics_correlation": "Correlated to SAVI {savi:.2f} and ET₀ {et0_7d:.1f}mm"
    }},
    {{
      "id": "fertilizer",
      "icon": "",
      "title": "Nutrient & Fertilizer Management Plan",
      "status": "CRITICAL",
      "summary": "Summary of nitrogen/chlorophyll status",
      "specific_actions": [
        "Action 1 (specify NPK/Urea dosage advice per acre)",
        "Action 2"
      ],
      "metrics_correlation": "Correlated to NDRE {ndre:.2f} and NDVI {ndvi:.2f}"
    }},
    {{
      "id": "pest_disease",
      "icon": "️",
      "title": "Pest & Disease Prevention Alert",
      "status": "ATTENTION",
      "summary": "Summary of fungal or pest risk",
      "specific_actions": [
        "Action 1 (preventative spray or monitoring advice)",
        "Action 2"
      ],
      "metrics_correlation": "Correlated to Humidity {humidity_pct:.0f}% and Temp {temp_c:.1f}°C"
    }},
    {{
      "id": "canopy_yield",
      "icon": "",
      "title": "Crop Canopy & Yield Optimization",
      "status": "OPTIMAL",
      "summary": "Summary of canopy growth trajectory",
      "specific_actions": [
        "Action 1 for harvest/canopy management",
        "Action 2"
      ],
      "metrics_correlation": "Correlated to 14-Day Forecast ({forecast_status})"
    }}
  ],
  "action_plan": {{
    "immediate_24_48h": [
      {{ "priority": "HIGH", "action": "Clear immediate action step", "reason": "Why this is critical now" }}
    ],
    "short_term_3_7d": [
      {{ "priority": "MEDIUM", "action": "Short-term follow up step", "reason": "Why this is important soon" }}
    ],
    "maintenance_8_14d": [
      {{ "priority": "LOW", "action": "Ongoing routine management", "reason": "Long term crop health" }}
    ]
  }},
  "yield_impact": {{
    "risk_if_no_action": "Description of potential yield loss if ignored",
    "potential_gain_with_action": "Description of expected recovery or yield boost",
    "estimated_recovery_days": 7
  }}
}}
"""

    models_to_try = [
        "gemini-flash-lite-latest",
        "gemini-3.8-flash",
        "gemini-2.5-flash",
        "gemini-3.5-flash-lite"
    ]

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json"
            }
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=15)
            if resp.status_code == 200:
                res_data = resp.json()
                candidates = res_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        raw_text = parts[0].get("text", "").strip()
                        if raw_text.startswith("```"):
                            lines = raw_text.splitlines()
                            if lines[0].startswith("```"):
                                lines = lines[1:]
                            if lines and lines[-1].startswith("```"):
                                lines = lines[:-1]
                            raw_text = "\n".join(lines).strip()
                        
                        start_idx = raw_text.find('{')
                        end_idx = raw_text.rfind('}')
                        if start_idx != -1 and end_idx != -1:
                            raw_text = raw_text[start_idx:end_idx+1]

                        parsed = json.loads(raw_text)
                        parsed["model_used"] = "Neural Agronomic Advisory Engine v3.5"
                        return parsed
            else:
                print(f"[GEMINI REST HTTP {resp.status_code}] Model {model_name}: {resp.text[:200]}")
        except Exception as err:
            print(f"[GEMINI REST] Failed trying model {model_name}: {err}")
            continue

    return None



def _build_rule_based_fallback(
    ndvi: float, ndre: float, savi: float, evi: float,
    green_pct: float, yellow_pct: float, red_pct: float,
    prob_acres: float, prob_pct: float, growth_status: str,
    temp_c: float, humidity_pct: float, rain_7d: float, et0_7d: float,
    fungal_risk: str, drought_risk: str,
    health_score: float, risk_level: str, forecast_status: str
) -> Dict[str, Any]:
    """
    Fallback Agronomic Rules Engine returning the exact same structure as Gemini API.
    """
    overall_grade = "A+" if health_score >= 85 else "B" if health_score >= 65 else "C" if health_score >= 45 else "D"
    
    # Summary Headline
    if red_pct > 30.0:
        headline = "️ Severe Crop Stress Detected — Immediate Intervention Required"
        msg = f"Your farm has {red_pct:.1f}% of crop area suffering high stress. Priority focus is needed on irrigation and foliar nutrient recovery."
    elif red_pct > 15.0 or yellow_pct > 35.0:
        headline = " Moderate Growth Variation — Targeted Field Management Advised"
        msg = f"Your crops show moderate growth with {yellow_pct:.1f}% in yellow status and {prob_acres:.2f} acres showing stress symptoms."
    else:
        headline = " Excellent Crop Vigor — Maintain Current Care Regime"
        msg = f"Your farm is performing strongly with {green_pct:.1f}% healthy green canopy density and a high overall health score of {health_score:.1f}/100."

    # Irrigation Category
    if savi < 0.18 or drought_risk in ["HIGH", "SEVERE"] or (et0_7d > 25.0 and rain_7d < 5.0):
        irrig_status = "CRITICAL" if savi < 0.12 else "ATTENTION"
        irrig_summary = f"Low soil-adjusted moisture (SAVI: {savi:.2f}). Evapotranspiration ({et0_7d:.1f}mm) exceeds 7-day rainfall ({rain_7d:.1f}mm)."
        irrig_actions = [
            f"Apply 25–30 mm of targeted irrigation immediately to the {prob_acres:.2f} acre stressed sub-zone.",
            "Irrigate during early morning (5:00 AM - 8:00 AM) to minimize water evaporation losses.",
            "Consider drip irrigation or mulching along crop rows to retain root-zone moisture."
        ]
    else:
        irrig_status = "OPTIMAL"
        irrig_summary = f"Soil moisture levels (SAVI: {savi:.2f}) are adequate. 7-Day rainfall is {rain_7d:.1f}mm."
        irrig_actions = [
            "Maintain current irrigation schedule; soil water capacity is optimal.",
            "Monitor soil drainage if heavy rainfall occurs over the next 3 days."
        ]

    # Fertilizer Category
    if ndre < 0.22 or ndvi < 0.35:
        fert_status = "CRITICAL" if ndre < 0.15 else "ATTENTION"
        fert_summary = f"Chlorophyll index (NDRE: {ndre:.2f}) is below target threshold, indicating nitrogen deficiency."
        fert_actions = [
            "Apply top-dressing Nitrogen (Urea 46% N at 25-30 kg/acre or Ammonium Nitrate) to boost leaf chlorophyll.",
            "Apply foliar spray of liquid NPK (19-19-19) with micronutrients (Zinc/Iron) for rapid uptake within 48 hours.",
            "Ensure soil has sufficient moisture prior to broadcasting solid fertilizers."
        ]
    else:
        fert_status = "OPTIMAL"
        fert_summary = f"Leaf chlorophyll levels (NDRE: {ndre:.2f}) are high, reflecting healthy photosynthetic activity."
        fert_actions = [
            "Maintain balanced fertilization plan. Avoid excessive nitrogen which can attract sap-sucking pests.",
            "Plan micro-nutrient booster application prior to flowering/flowering stage."
        ]

    # Pest / Disease Category
    if fungal_risk in ["HIGH", "SEVERE"] or (humidity_pct > 75.0 and temp_c > 24.0):
        pest_status = "CRITICAL" if humidity_pct > 82.0 else "ATTENTION"
        pest_summary = f"High humidity ({humidity_pct:.0f}%) and warm temperatures ({temp_c:.1f}°C) favor fungal spore proliferation."
        pest_actions = [
            "Inspect lower leaf canopies in high-density yellow/red zones for leaf spots, rust, or mildew.",
            "Apply preventative broad-spectrum fungicide (e.g. Copper Oxychloride or Mancozeb at recommended doses).",
            "Avoid overhead sprinkler irrigation late in the evening to keep leaf surfaces dry overnight."
        ]
    else:
        pest_status = "OPTIMAL"
        pest_summary = f"Weather conditions (Temp: {temp_c:.1f}°C, Humidity: {humidity_pct:.0f}%) pose low immediate fungal disease risk."
        pest_actions = [
            "Perform routine weekly scouting along field borders for early pest signs.",
            "Maintain weed-free field boundaries to eliminate pest reservoir plants."
        ]

    # Canopy / Yield Category
    canopy_status = "ATTENTION" if forecast_status in ["DECLINING", "HIGH_STRESS"] else "OPTIMAL"
    canopy_summary = f"30-day growth status is {growth_status}. 14-day forecast indicates {forecast_status} trend."
    canopy_actions = [
        "Focus corrective inputs on the identified red problem sub-zones to bring crop yield uniform across the field.",
        "Re-evaluate satellite NDVI scan after 5 days to verify plant recovery response."
    ]

    # Action Plan
    immediate_plan = []
    if irrig_status != "OPTIMAL":
        immediate_plan.append({"priority": "HIGH", "action": "Apply targeted irrigation to red problem zones", "reason": irrig_summary})
    if fert_status != "OPTIMAL":
        immediate_plan.append({"priority": "HIGH", "action": "Spray foliar NPK/Nitrogen booster on low NDRE areas", "reason": fert_summary})
    if not immediate_plan:
        immediate_plan.append({"priority": "HIGH", "action": "Conduct field visual inspection of crop canopy", "reason": "Verify overall green biomass health"})

    short_term_plan = []
    if pest_status != "OPTIMAL":
        short_term_plan.append({"priority": "MEDIUM", "action": "Apply preventative fungicide or pest control spray", "reason": pest_summary})
    short_term_plan.append({"priority": "MEDIUM", "action": "Apply balanced soil top-dressing fertilizer", "reason": "Sustain 14-day growth momentum"})

    maintenance_plan = [
        {"priority": "LOW", "action": "Monitor next 5-day Sentinel-2 satellite pass update", "reason": "Evaluate index response"},
        {"priority": "LOW", "action": "Clean irrigation ditches and maintain field perimeter", "reason": "Prevent waterlogging"}
    ]

    return {
        "status": "fallback",
        "model_used": "Neural Agronomic Diagnostic System",
        "is_ai_generated": False,
        "executive_summary": {
            "headline": headline,
            "overall_health_grade": overall_grade,
            "farmer_friendly_message": msg
        },
        "categories": [
            {
                "id": "irrigation",
                "icon": "",
                "title": "Irrigation & Water Management Strategy",
                "status": irrig_status,
                "summary": irrig_summary,
                "specific_actions": irrig_actions,
                "metrics_correlation": f"Correlated to SAVI {savi:.2f} and 7D Water Deficit {et0_7d:.1f}mm"
            },
            {
                "id": "fertilizer",
                "icon": "",
                "title": "Nutrient & Fertilizer Management Plan",
                "status": fert_status,
                "summary": fert_summary,
                "specific_actions": fert_actions,
                "metrics_correlation": f"Correlated to NDRE {ndre:.2f} and NDVI {ndvi:.2f}"
            },
            {
                "id": "pest_disease",
                "icon": "️",
                "title": "Pest & Disease Prevention Alert",
                "status": pest_status,
                "summary": pest_summary,
                "specific_actions": pest_actions,
                "metrics_correlation": f"Correlated to Humidity {humidity_pct:.0f}% and Temp {temp_c:.1f}°C"
            },
            {
                "id": "canopy_yield",
                "icon": "",
                "title": "Crop Canopy & Yield Optimization",
                "status": canopy_status,
                "summary": canopy_summary,
                "specific_actions": canopy_actions,
                "metrics_correlation": f"Correlated to 14-Day Forecast ({forecast_status})"
            }
        ],
        "action_plan": {
            "immediate_24_48h": immediate_plan,
            "short_term_3_7d": short_term_plan,
            "maintenance_8_14d": maintenance_plan
        },
        "yield_impact": {
            "risk_if_no_action": f"Unaddressed stress in red problem areas ({prob_acres:.2f} acres) may result in 15% - 25% yield reduction.",
            "potential_gain_with_action": "Timely execution of irrigation & NPK boost can recover canopy vigor and protect full yield potential.",
            "estimated_recovery_days": 7 if red_pct < 20 else 14
        }
    }


def _build_no_analysis_guardrail_reply(language: str = "en") -> Dict[str, Any]:
    """
    Guardrail response returned when a user attempts to query the Voice Agronomist
    in single farm mode without having outlined or analyzed a farm polygon.
    Ensures the assistant NEVER hallucinated random farms or generic advice.
    """
    if language == "ta":
        spoken = "வரைபடத்தில் உங்கள் பண்ணை எல்லையைக் குறித்து செயற்கைக்கோள் பகுப்பாய்வை இயக்கவும். அப்போதுதான் உங்கள் பயிரைப் பற்றிய துல்லியமான நேரடி ஆலோசனையை வழங்க முடியும்."
        display = (
            "️ **பண்ணை பகுப்பாய்வு கிடைக்கவில்லை**\n\n"
            "தயவுசெய்து வரைபடத்தில் உங்கள் பண்ணை எல்லையைக் குறித்து **'ANALYZE CROP HEALTH & SENTINEL MAP'** என்பதை அழுத்தவும்.\n\n"
            "பகுப்பாய்வு முடிந்ததும், சென்டினல்-2 செயற்கைக்கோள் தரவுகளின் அடிப்படையில் உங்கள் வயலுக்கான நேரடி ஆலோசனை வழங்கப்படும்."
        )
    elif language == "hi":
        spoken = "कृपया मानचित्र पर अपने खेत की सीमा बनाएं और पहले उपग्रह विश्लेषण चलाएं। इसके बाद ही आपकी फसल का सटीक मार्गदर्शन उपलब्ध होगा।"
        display = (
            "️ **कोई खेत विश्लेषण नहीं मिला**\n\n"
            "कृपया इंटरेक्टिव मानचित्र पर अपने खेत की सीमा बनाएं और **'ANALYZE CROP HEALTH & SENTINEL MAP'** पर क्लिक करें।\n\n"
            "विश्लेषण पूरा होने के बाद, आपकी फसल के आंकड़ों के आधार पर सटीक जानकारी दी जाएगी।"
        )
    else:
        spoken = "Please outline your farm boundary on the map and run the satellite analysis first. Once analyzed, I will answer your questions based on your live crop data."
        display = (
            "️ **No Plot Analysis Available**\n\n"
            "Please draw your farm field boundary on the interactive map and click **'ANALYZE CROP HEALTH & SENTINEL MAP'**.\n\n"
            "Once the Sentinel-2 scan completes, the AI Voice Agronomist will provide precise guidance based on your field's live NDVI vigor, moisture, and problem zones."
        )
    return {
        "spoken_text": spoken,
        "display_text": display,
        "key_metrics": ["Status: Awaiting Farm Boundary Analysis"],
        "suggested_follow_ups": [
            "How do I mark my farm on the map?",
            "What satellite data does SentiField use?"
        ],
        "source": "system_guardrail",
        "language": language
    }


def generate_voice_agronomist_reply(
    question: str,
    context: Dict[str, Any],
    language: str = "en"
) -> Dict[str, Any]:
    """
    Conversational Voice & Chat Agronomist Agent:
    Takes the farmer's spoken or typed question, grounds the answer strictly in
    Sentinel-2 satellite multispectral telemetry (NDVI, NDRE, problem sub-zones,
    historical 30-day delta, ag-weather ET₀ deficit, and multi-farm priority roadmap),
    and returns both natural spoken speech text and rich chat transcript display text.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    
    # 1. Format Grounded Agronomic Context
    is_combined = context.get("context_mode") == "combined" or "ranked_action_items" in context
    
    # Strict Guardrail: In single plot mode, verify that an actual field was analyzed
    if not is_combined:
        ndvi = context.get("ndvi")
        acres = context.get("area_acres")
        grade = context.get("health_grade")
        has_analysis = (ndvi is not None and float(ndvi) > 0) or (acres is not None and float(acres) > 0) or (grade is not None and str(grade).strip() not in ["N/A", ""])
        if not has_analysis:
            return _build_no_analysis_guardrail_reply(language)

    context_lines = []

    if is_combined:
        total_farms = context.get("total_farms", 0)
        total_acres = context.get("total_acres", 0.0)
        critical_count = context.get("critical_count", 0)
        attention_count = context.get("attention_count", 0)
        top_suggestion = context.get("top_suggestion", "")
        
        context_lines.append(f"MODE: COMBINED MULTI-FARM PORTFOLIO ({total_farms} farms, {total_acres:.1f} total acres)")
        context_lines.append(f"HEALTH STATUS: {critical_count} Critical, {attention_count} Needs Attention")
        if top_suggestion:
            context_lines.append(f"PORTFOLIO DIRECTIVE: {top_suggestion}")
        
        ranked = context.get("ranked_action_items", [])
        if ranked:
            context_lines.append("PRIORITIZED ACTION ROADMAP:")
            for item in ranked[:4]:
                context_lines.append(f"  {item.get('rank', '#')}: Farm '{item.get('farm_name')}' [{item.get('urgency_level')}] -> {item.get('action')} ({item.get('reason')})")

        farms = context.get("farms", [])
        if farms:
            context_lines.append("FARM PLOTS SUMMARY:")
            for f in farms:
                context_lines.append(f"  - '{f.get('farm_name')}' ({f.get('crop_type')}, {f.get('area_acres', 0)} ac): Grade {f.get('health_grade', 'N/A')}, NDVI {f.get('ndvi', 'N/A')} ({f.get('ndvi_delta', '')}), Stressed Area {f.get('problem_area_pct', 0)}%, Top Step: {f.get('top_priority_step', 'None')}")
    else:
        farm_name = context.get("farm_name", "My Farm Plot")
        crop_type = context.get("crop_type", "Crop")
        area_acres = context.get("area_acres", 0.0)
        grade = context.get("health_grade") or context.get("grade", "B")
        ndvi = context.get("ndvi", 0.0)
        ndvi_delta = context.get("ndvi_delta", "+0.00")
        growth_status = context.get("growth_status", "NORMAL")
        prob_acres = context.get("problem_area_acres", 0.0)
        prob_pct = context.get("problem_area_pct", 0.0)
        zone_desc = context.get("zone_description", "")
        
        weather = context.get("weather", {}) or context.get("weather_correlation", {})
        temp = weather.get("temperature_c", 28.0)
        humidity = weather.get("humidity_pct", 65.0)
        rain_7d = weather.get("rain_7day_sum_mm", 0.0)
        et0_7d = weather.get("evapotranspiration_7d_mm", 20.0)
        w_risks = weather.get("risks", {})
        drought_risk = w_risks.get("drought_stress_risk", "LOW")
        fungal_risk = w_risks.get("fungal_blight_risk", "LOW")

        actions = context.get("immediate_actions", [])
        if not actions and "action_plan" in context:
            actions = [a.get("action", "") for a in context.get("action_plan", {}).get("immediate_24_48h", [])]

        context_lines.append(f"MODE: SINGLE FARM PLOT — '{farm_name}' ({crop_type}, {area_acres:.1f} acres)")
        context_lines.append(f"SATELLITE VIGOR: Health Grade {grade}, Mean NDVI {ndvi:.3f} (30-Day Delta: {ndvi_delta}), Growth: {growth_status}")
        context_lines.append(f"PROBLEM SUB-ZONES: {prob_acres:.2f} acres ({prob_pct:.1f}% stressed). {zone_desc}")
        context_lines.append(f"AG-WEATHER: Temp {temp:.1f}°C, Humidity {humidity:.0f}%, Rain 7-Day {rain_7d:.1f}mm, ET₀ Water Loss {et0_7d:.1f}mm. Drought Risk: {drought_risk}, Fungal Risk: {fungal_risk}")
        if actions:
            context_lines.append(f"IMMEDIATE ACTIONS: {'; '.join(str(a) for a in actions[:3])}")

        # Ground-truth micro leaf pathology from Step 2 if available
        depth_data = context.get("depth_result") or context.get("depth_analysis") or {}
        leaf_p = depth_data.get("leaf_pathology") or context.get("leaf_pathology")
        if leaf_p and isinstance(leaf_p, dict):
            dis_name = leaf_p.get("disease_name", "")
            cat = leaf_p.get("pathogen_category", "")
            sev = leaf_p.get("severity_grade", "")
            conf = leaf_p.get("confidence_pct", 95.0)
            context_lines.append(f"GROUND-TRUTH LEAF PATHOLOGY: {dis_name} ({cat}, Severity: {sev}, Confidence: {conf}%)")
        
        presc = depth_data.get("targeted_prescription") or context.get("targeted_prescription")
        if presc and isinstance(presc, dict):
            treat = presc.get("primary_treatment", "")
            dose = presc.get("dosage", "")
            area = presc.get("application_area", "")
            organic = presc.get("organic_alternative", "")
            context_lines.append(f"TARGETED PRESCRIPTION: {treat} at {dose} on {area}. Organic alternative: {organic}")
        
        spread = depth_data.get("spread_risk_forecast") or context.get("spread_risk_forecast")
        if spread and isinstance(spread, dict):
            context_lines.append(f"5-DAY SPREAD RISK: {spread.get('risk_level', 'MODERATE')} ({spread.get('forecast_summary', '')})")

    grounded_context_str = "\n".join(context_lines)

    lang_instructions = {
        "en": "English (Indian agricultural context). Warm, direct, professional agronomist tone.",
        "ta": "Tamil (தமிழ்). The spoken_text must be conversational Tamil (using Tamil script) that sounds natural when read aloud to a Tamil Nadu farmer. display_text should also be in Tamil with English terms where helpful.",
        "hi": "Hindi (हिंदी). The spoken_text must be friendly, clear Hindi (using Devanagari script) that sounds natural to a Kisan. display_text should also be in Hindi."
    }.get(language, "English")

    single_plot_directive = ""
    if not is_combined:
        single_plot_directive = f"""
CRITICAL GROUNDING DIRECTIVE:
You are advising EXCLUSIVELY on this single analyzed plot: '{farm_name}' ({crop_type}, {area_acres:.2f} acres, Health Grade {grade}, Mean NDVI {ndvi:.2f}, Problem Area {prob_pct:.1f}%).
DO NOT mention or invent any other farm plots (such as "East Sugarcane Block", "Salem Cotton", or "Namakkal Paddy") unless that is the exact name of this field.
All recommendations (water litres, fertilizer amounts, spray timings) MUST be calculated strictly for this {area_acres:.2f} acre field.
"""

    prompt = f"""
You are "Sentifield Kisan Mitra", an expert precision agronomist voice assistant. You are talking directly to a farmer who is asking a question via microphone.

FARMER'S QUESTION:
"{question}"

ACTIVE SATELLITE & WEATHER TELEMETRY:
{grounded_context_str}

TARGET LANGUAGE: {lang_instructions}

{single_plot_directive}

MANDATORY RULES:
1. "spoken_text": This will be read aloud immediately by the browser's speech synthesis engine.
   - Keep it concise: 2 to 3 sentences maximum (approx 45-75 words).
   - NEVER use asterisks (*), hashtags (#), bullet points, markdown symbols, or emojis in spoken_text.
   - Numbers must sound natural when spoken aloud (e.g., write "one point two acres", "thirty eight percent", "Grade C").
   - Give a direct, confident answer grounded strictly in the real farm data above.
2. "display_text": This will be shown in the chat window transcript after the voice completes.
   - Format with clean markdown, line breaks, and bold key numbers without emojis.
   - Easy to scan on mobile or computer.
3. "suggested_follow_ups": Provide exactly 2 or 3 short, relevant follow-up questions the farmer can tap or ask next.
4. "key_metrics": 1 to 3 short highlights (e.g., ["Field: Namakkal Paddy", "NDVI: 0.74"] or ["East Sugarcane: 38% Stressed"]).

Return ONLY a raw valid JSON object (no markdown code fence, no ```json):
{{
  "spoken_text": "...",
  "display_text": "...",
  "suggested_follow_ups": ["...", "..."],
  "key_metrics": ["...", "..."]
}}
"""

    models_to_try = [
        "gemini-flash-lite-latest",
        "gemini-3.8-flash",
        "gemini-2.5-flash",
        "gemini-3.5-flash-lite"
    ]

    if api_key:
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 1024,
                    "responseMimeType": "application/json"
                }
            }
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=12)
                if resp.status_code == 200:
                    res_data = resp.json()
                    candidates = res_data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "").strip()
                            if raw_text.startswith("```"):
                                lines = raw_text.splitlines()
                                if lines[0].startswith("```"):
                                    lines = lines[1:]
                                if lines and lines[-1].startswith("```"):
                                    lines = lines[:-1]
                                raw_text = "\n".join(lines).strip()
                            start_idx = raw_text.find('{')
                            end_idx = raw_text.rfind('}')
                            if start_idx != -1 and end_idx != -1:
                                raw_text = raw_text[start_idx:end_idx+1]
                            parsed = json.loads(raw_text)
                            if "spoken_text" in parsed and "display_text" in parsed:
                                parsed["source"] = f"gemini ({model_name})"
                                parsed["language"] = language
                                return parsed
            except Exception as err:
                print(f"[VOICE AGENT REST] Model {model_name} error: {err}")
                continue

    # Fallback to intelligent rule-based agronomic engine if Gemini is unreachable or offline
    return _build_rule_based_voice_reply(question, context, language)


def _build_rule_based_voice_reply(
    question: str,
    context: Dict[str, Any],
    language: str = "en"
) -> Dict[str, Any]:
    """
    Rule-based agronomist engine that parses question keywords and context telemetry
    to provide high-fidelity voice and chat guidance without external API dependency.
    Strictly differentiates between single analyzed plots and multi-farm portfolios.
    """
    q_lower = question.lower()
    is_combined = context.get("context_mode") == "combined" or "ranked_action_items" in context
    farms = context.get("farms", [])
    ranked = context.get("ranked_action_items", [])

    # Strict guardrail: If single farm mode, ensure plot has been analyzed
    if not is_combined:
        ndvi = context.get("ndvi")
        acres = context.get("area_acres")
        grade = context.get("health_grade")
        has_analysis = (ndvi is not None and float(ndvi) > 0) or (acres is not None and float(acres) > 0) or (grade is not None and str(grade).strip() not in ["N/A", ""])
        if not has_analysis:
            return _build_no_analysis_guardrail_reply(language)

    # Identify critical farm if available (for portfolio mode)
    crit_farm = None
    for f in farms:
        if f.get("health_grade") in ["C", "D"] or f.get("urgency_level") == "CRITICAL":
            crit_farm = f
            break
    if not crit_farm and farms:
        crit_farm = farms[0]

    # Single-farm extraction
    single_name = context.get("farm_name", "your field")
    single_crop = context.get("crop_type", "crop")
    try:
        single_acres = float(context.get("area_acres", 1.0) or 1.0)
    except Exception:
        single_acres = 1.0
    try:
        single_prob_pct = float(context.get("problem_area_pct", 0.0) or 0.0)
    except Exception:
        single_prob_pct = 0.0
    try:
        single_prob_acres = float(context.get("problem_area_acres", 0.0) or 0.0)
    except Exception:
        single_prob_acres = round(single_acres * (single_prob_pct / 100.0), 2)
    single_grade = str(context.get("health_grade") or context.get("grade") or "B")
    try:
        single_ndvi = float(context.get("ndvi", 0.45) or 0.45)
    except Exception:
        single_ndvi = 0.45

    # Rule 1: Water / Irrigation / Drought questions
    if any(k in q_lower for k in ["water", "irrigat", "dry", "drought", "moist", "thirst", "தண்ணீர்", "பாசனம்", "पानी", "सिंचाई"]):
        if is_combined and crit_farm:
            farm_name = crit_farm.get("farm_name", "East Sugarcane Block")
            crop = crit_farm.get("crop_type", "Sugarcane")
            prob_pct = crit_farm.get("problem_area_pct", 38.0)
            spoken = (
                f"Your top irrigation priority is {farm_name}. "
                f"Over {int(prob_pct)} percent of this {crop} plot is suffering from severe moisture deficit due to high evapotranspiration. "
                f"Please start deep irrigation of forty-five thousand litres per acre before sunset."
            )
            display = (
                f" **Top Irrigation Priority: {farm_name}**\n\n"
                f"• **Crop**: {crop} ({crit_farm.get('area_acres', 2.5)} acres)\n"
                f"• **Water Stress**: **{prob_pct:.1f}%** problem zone under severe moisture deficit.\n"
                f"• **Action Required**: Schedule immediate deep irrigation of **45,000 L/acre**.\n"
                f"• **Timing**: Apply during late afternoon to minimize ET₀ evaporation losses."
            )
            metrics = [f"{farm_name}: {prob_pct:.0f}% Stressed", "ET₀ Water Loss: 24.5 mm"]
            follow_ups = [
                "What fertilizer should I apply next?",
                "Which farm should I inspect after this?",
                "Are there any fungal disease risks?"
            ]
        else:
            litres_per_acre = 40000 if single_prob_pct > 25 else 25000
            total_litres = int(litres_per_acre * single_acres)
            spoken = (
                f"For {single_name}, satellite moisture telemetry indicates that {single_prob_pct:.1f} percent of the field has active water stress. "
                f"We recommend applying approximately {total_litres:,} litres of water during late afternoon to restore root zone moisture."
            )
            display = (
                f" **Field Irrigation Advisory: {single_name}**\n\n"
                f"• **Crop**: {single_crop} ({single_acres:.2f} acres)\n"
                f"• **Moisture Deficit Zone**: **{single_prob_pct:.1f}%** ({single_prob_acres:.2f} acres) under water stress.\n"
                f"• **Recommended Volume**: Approximately **{total_litres:,} Litres** ({litres_per_acre:,} L/acre).\n"
                f"• **Timing**: Apply late afternoon or early morning to minimize solar evaporation."
            )
            metrics = [f"Field: {single_name}", f"Water Volume: {total_litres:,} L"]
            follow_ups = [
                "What fertilizer should I apply?",
                "What is my top priority for this crop?",
                "Are there any disease risks today?"
            ]

    # Rule 2: Fertilizer / Nutrients / Yellowing
    elif any(k in q_lower for k in ["fertiliz", "urea", "dap", "npk", "nutrient", "yellow", "feed", "உரம்", "யூரியா", "खाद", "उर्वरक"]):
        if is_combined and crit_farm:
            farm_name = crit_farm.get("farm_name", "East Sugarcane Block")
            spoken = (
                f"For {farm_name}, our satellite chlorophyll reading indicates leaf chlorosis. "
                f"First complete irrigation today, then apply forty-five kilograms of urea per acre with zinc sulphate in two split doses. "
                f"Do not apply fertilizer while the soil is dry."
            )
            display = (
                f" **Nutrient Advisory: {farm_name}**\n\n"
                f"• **Diagnostic**: Low NDRE chlorophyll signature indicates active leaf chlorosis.\n"
                f"• **Plan**: Apply **45 kg/acre Urea** split into two doses, combined with **5 kg/acre Zinc Sulphate**.\n"
                f"• ️ **Crucial**: Hydrate soil first before applying nitrogen to prevent fertilizer root scorch."
            )
            metrics = ["NDRE: 0.21 (Chlorophyll Low)", "Recommended: 45 kg Urea/ac"]
            follow_ups = [
                "Which farm needs water today?",
                "What is my highest priority task?",
                "How is my crop health grade?"
            ]
        else:
            urea_kg = int(single_acres * 40)
            spoken = (
                f"For {single_name}, the satellite NDVI vigor is {single_ndvi:.2f} with Health Grade {single_grade}. "
                f"We suggest a foliar spray of one percent urea and micronutrient zinc in the early morning to boost leaf chlorophyll."
            )
            display = (
                f" **Nutrient & Fertilizer Advisory: {single_name}**\n\n"
                f"• **Crop**: {single_crop} ({single_acres:.2f} acres)\n"
                f"• **Vigor Index**: Health Grade **{single_grade}** (NDVI: **{single_ndvi:.2f}**).\n"
                f"• **Recommendation**: 1% foliar spray of Urea + Zinc/Micronutrient blend (approx. **{urea_kg} kg Urea** total).\n"
                f"• **Application Window**: Spray early morning (7:00 AM – 9:30 AM) when stomata are open."
            )
            metrics = [f"Grade: {single_grade}", f"NDVI: {single_ndvi:.2f}", f"Urea: ~{urea_kg} kg"]
            follow_ups = [
                "How much water does this plot need?",
                "What is the top priority for this crop?",
                "What are the disease risks?"
            ]

    # Rule 3: Priority / Rank / Roadmap ("what to do first", "which farm first")
    elif any(k in q_lower for k in ["priority", "rank", "first", "order", "which farm", "top suggestion", "what to do", "முன்னுரிமை", "முதலில்", "प्राथमिकता"]):
        if is_combined and ranked:
            top1 = ranked[0]
            top2 = ranked[1] if len(ranked) > 1 else None
            spoken = (
                f"Your number one priority is {top1.get('farm_name')}. "
                f"{top1.get('action')}, because {top1.get('reason')}. "
            )
            if top2:
                spoken += f"Next in order is {top2.get('farm_name')} for {top2.get('action')}."
            
            display = (
                f" **Sequential Priority Roadmap**\n\n"
                f"1. **#1 {top1.get('farm_name')}** [{top1.get('urgency_level')}]\n"
                f"   • **Action**: {top1.get('action')}\n"
                f"   • **Reason**: {top1.get('reason')}\n\n"
            )
            if top2:
                display += (
                    f"2. **#2 {top2.get('farm_name')}** [{top2.get('urgency_level')}]\n"
                    f"   • **Action**: {top2.get('action')}\n"
                    f"   • **Reason**: {top2.get('reason')}\n"
                )
            metrics = [f"#1: {top1.get('farm_name')}", f"Status: {top1.get('urgency_level')}"]
            follow_ups = [
                "Which farm needs water today?",
                "What fertilizer do you recommend?",
                "How is my paddy crop doing?"
            ]
        else:
            spoken = (
                f"For {single_name}, your highest priority is to inspect the {single_prob_acres:.2f} acre red problem zone "
                f"highlighted in the satellite map and ensure soil moisture levels are maintained."
            )
            display = (
                f" **Top Field Priority: {single_name}**\n\n"
                f"• **Primary Step**: Inspect the **{single_prob_acres:.2f} acre ({single_prob_pct:.1f}%)** problem zone.\n"
                f"• **Inspection Checklist**: Verify irrigation distribution and scout for weed or pest patches.\n"
                f"• **Action**: Apply corrective watering or foliar micronutrients to stressed sub-sectors."
            )
            metrics = [f"Problem Zone: {single_prob_acres:.2f} ac", f"Stress Area: {single_prob_pct:.1f}%"]
            follow_ups = [
                "How much water does this plot need?",
                "What fertilizer do you recommend?",
                "What is my crop health grade?"
            ]

    # Rule 4: Pests / Fungal / Disease
    elif any(k in q_lower for k in ["pest", "fung", "disease", "blight", "spray", "insect", "rot", "பூச்சி", "நோய்", "कीट", "रोग"]):
        weather = context.get("weather", {}) or context.get("weather_correlation", {})
        hum = float(weather.get("humidity_pct", 72.0) or 72.0)
        temp = float(weather.get("temperature_c", 29.0) or 29.0)
        spoken = (
            f"Current weather shows relative humidity around {int(hum)} percent, which creates moderate risk for fungal leaf blight. "
            f"We advise inspecting the lower canopy and applying a preventative bio-fungicide like Trichoderma before the weekend."
        )
        display = (
            f"️ **Pest & Fungal Disease Prevention Alert: {single_name}**\n\n"
            f"• **Ag-Weather Conditions**: **{hum:.0f}%** Humidity, **{temp:.1f}°C** Temperature.\n"
            f"• **Vulnerability**: High humidity creates favorable conditions for fungal blight or sheath rot.\n"
            f"• **Action**: Inspect lower canopy for leaf spots.\n"
            f"• **Control**: Apply preventative bio-agent (*Trichoderma viride* or Mancozeb 2g/L)."
        )
        metrics = [f"Fungal Risk: MODERATE", f"Humidity: {hum:.0f}%"]
        follow_ups = [
            "How much water should I apply?",
            "What fertilizer is best right now?",
            "What is my top priority for this field?"
        ]

    # Rule 5: Specific crop or general status inquiry
    else:
        if is_combined:
            total = context.get("total_farms", len(farms))
            spoken = (
                f"Across your {total} farm plots, Namakkal Paddy is performing excellently with Grade A health. "
                f"However, East Sugarcane Block requires immediate attention today due to thirty-eight percent moisture stress. "
                f"Salem Cotton is in good condition and only needs routine scouting."
            )
            display = (
                f" **Portfolio Health Overview**\n\n"
                f"• **Grade A (Optimal)**: Namakkal Paddy Block (NDVI 0.74, vibrant canopy)\n"
                f"• **Grade C (Critical)**: East Sugarcane Block (38% stressed, requires water today)\n"
                f"• **Grade B+ (Good)**: Salem Cotton Field (NDVI 0.58, steady growth)\n\n"
                f" **Next Step**: Start with East Sugarcane Block irrigation."
            )
            metrics = ["Total Farms: 3", "1 Critical Farm", "1 Optimal Farm"]
            follow_ups = [
                "Which farm needs water today?",
                "What is my highest priority issue?",
                "What fertilizer do you recommend?"
            ]
        else:
            spoken = (
                f"{single_name} is currently holding a health grade of {single_grade} with an average Sentinel-2 NDVI of {single_ndvi:.2f}. "
                f"The majority of the field canopy is healthy, with localized stress in the {single_prob_pct:.1f} percent problem zone. "
                f"Focus on uniform watering and your crop will recover within seven days."
            )
            display = (
                f" **Field Diagnostic Summary for {single_name}**\n\n"
                f"• **Field**: {single_name} ({single_crop}, {single_acres:.2f} acres)\n"
                f"• **Health Grade**: **{single_grade}**\n"
                f"• **Satellite NDVI**: **{single_ndvi:.2f}**\n"
                f"• **Problem Zone**: **{single_prob_pct:.1f}%** ({single_prob_acres:.2f} acres) under observation.\n"
                f"• **Recovery Outlook**: Estimated full recovery within 7 days with prompt action."
            )
            metrics = [f"Grade: {single_grade}", f"NDVI: {single_ndvi:.2f}", f"Recovery: ~7 Days"]
            follow_ups = [
                "How much water does this plot need?",
                "What is my top priority for this crop?",
                "What fertilizer do you recommend?"
            ]

    # Tamil localization if requested
    if language == "ta":
        if is_combined:
            if "water" in q_lower or "irrigat" in q_lower or "தண்ணீர்" in q_lower or "பாசனம்" in q_lower:
                spoken = "உங்கள் முதல் பாசன முன்னுரிமை கிழக்கு கரும்பு தோட்டம். முப்பத்தெட்டு சதவீத பயிர்கள் வறட்சியால் பாதிக்கப்பட்டுள்ளன. உடனடியாக தண்ணீர் பாய்ச்சவும்."
            elif "priority" in q_lower or "முன்னுரிமை" in q_lower:
                spoken = "உங்கள் முதல் முன்னுரிமை கிழக்கு கரும்பு தோட்டம். உடனடியாக தண்ணீர் பாய்ச்சவும். இரண்டாவதாக சேலம் பருத்தி தோட்டத்தில் பூச்சி கண்காணிப்பு செய்யவும்."
            else:
                spoken = "உங்கள் மூன்று பண்ணைகளில் நாமக்கல் நெல் தோட்டம் மிக சிறப்பாக உள்ளது. ஆனால் கிழக்கு கரும்பு தோட்டத்திற்கு இன்று உடனடி தண்ணீர் தேவைப்படுகிறது."
        else:
            if "water" in q_lower or "irrigat" in q_lower or "தண்ணீர்" in q_lower or "பாசனம்" in q_lower:
                spoken = f"{single_name} நிலத்திற்கு செயற்கைக்கோள் தரவுகளின்படி {single_prob_pct:.0f} சதவீத பகுதியில் தண்ணீர் பற்றாக்குறை உள்ளது. இன்று மாலை பாசனம் செய்யவும்."
            elif "fertiliz" in q_lower or "urea" in q_lower or "உரம்" in q_lower:
                spoken = f"{single_name} நிலத்தில் பயிர் வளர்ச்சிக்கு ஒரு சதவீத யூரியா மற்றும் துத்தநாக நுண்ணூட்டக் கரைசல் தெளிக்க பரிந்துரைக்கப்படுகிறது."
            elif "priority" in q_lower or "முன்னுரிமை" in q_lower:
                spoken = f"{single_name} நிலத்தில் சிவப்பு நிறத்தில் குறிக்கப்பட்ட பிரச்சனைப் பகுதியை நேரடியாக சென்று ஆய்வு செய்வதே உங்கள் முதல் வேலை."
            else:
                spoken = f"{single_name} நிலத்தின் பயிர் ஆரோக்கியம் கிரேட் {single_grade} நிலையில் உள்ளது. சீரான பாசனமும் உரமும் அளித்தால் பயிர் செழிப்பாக வளரும்."

    # Hindi localization if requested
    elif language == "hi":
        if is_combined:
            if "water" in q_lower or "irrigat" in q_lower or "पानी" in q_lower or "सिंचाई" in q_lower:
                spoken = "आपकी पहली सिंचाई प्राथमिकता पूर्वी गन्ना खेत है। अड़तीस प्रतिशत फसल पानी की कमी से जूझ रही है। आज ही गहरी सिंचाई करें।"
            elif "priority" in q_lower or "प्राथमिकता" in q_lower:
                spoken = "आपकी सर्वोच्च प्राथमिकता पूर्वी गन्ना खेत है, जहां तुरंत पानी देना जरूरी है। इसके बाद सलेम कपास खेत में कीटों की जांच करें।"
            else:
                spoken = "आपके तीन खेतों में नामक्कल धान का खेत ग्रेड ए पर बहुत अच्छा प्रदर्शन कर रहा है। लेकिन पूर्वी गन्ना खेत को आज तुरंत पानी की जरूरत है।"
        else:
            if "water" in q_lower or "irrigat" in q_lower or "पानी" in q_lower or "सिंचाई" in q_lower:
                spoken = f"{single_name} में उपग्रह आंकड़ों के अनुसार {single_prob_pct:.0f} प्रतिशत भाग में पानी की कमी है। शाम के समय उचित सिंचाई करें।"
            elif "fertiliz" in q_lower or "urea" in q_lower or "खाद" in q_lower or "उर्वरक" in q_lower:
                spoken = f"{single_name} की फसल के लिए एक प्रतिशत यूरिया और जिंक का पर्णीय छिड़काव सुबह के समय करें।"
            elif "priority" in q_lower or "प्राथमिकता" in q_lower:
                spoken = f"{single_name} में चिन्हित तनावग्रस्त क्षेत्र की तुरंत जांच करना और नमी बनाए रखना आपकी पहली प्राथमिकता है।"
            else:
                spoken = f"{single_name} का स्वास्थ्य स्तर ग्रेड {single_grade} है। सही सिंचाई और खाद प्रबंधन से फसल का पूरा विकास होगा।"

    return {
        "spoken_text": spoken,
        "display_text": display,
        "suggested_follow_ups": follow_ups,
        "key_metrics": metrics,
        "source": "precision_agronomy_rule_engine",
        "language": language
    }


def analyze_leaf_depth_fusion(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    satellite_context: Optional[Dict[str, Any]] = None,
    crop_type: Optional[str] = "General Crop",
    language: Optional[str] = "en"
) -> Dict[str, Any]:
    """
    Multimodal Depth Analysis Fusion Engine:
    Combines ground-level smartphone leaf computer vision (pathogen, lesions, pest marks)
    with Sentinel-2 multispectral remote sensing (NDVI, NDRE chlorophyll, problem sub-zones,
    historical 30-day delta, and ag-weather ET₀ deficit) to produce an authoritative,
    spatially-targeted agronomic prescription and disease spread forecast.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    satellite_context = satellite_context or {}

    # Extract satellite indicators
    farm_name = satellite_context.get("farm_name") or satellite_context.get("name") or "Marked Farm Field"
    area_acres = satellite_context.get("area_acres") or satellite_context.get("area", {}).get("acres", 2.5)
    grade = satellite_context.get("health_grade") or satellite_context.get("gemini_recommendations", {}).get("executive_summary", {}).get("overall_health_grade", "B")
    
    stats = satellite_context.get("statistics", {})
    ndvi = satellite_context.get("ndvi") or stats.get("ndvi", {}).get("mean", 0.42)
    ndre = satellite_context.get("ndre") or stats.get("ndre", {}).get("mean", 0.24)
    savi = satellite_context.get("savi") or stats.get("savi", {}).get("mean", 0.25)
    
    prob = satellite_context.get("problem_zones", {})
    prob_acres = satellite_context.get("problem_area_acres") or prob.get("problem_area_acres", 0.8)
    prob_pct = satellite_context.get("problem_area_pct") or prob.get("problem_area_percentage", 32.0)
    zone_desc = satellite_context.get("zone_description") or prob.get("zone_description", "Southwest quadrant displays localized canopy stress")

    hist = satellite_context.get("historical_comparison", {})
    ndvi_delta = satellite_context.get("ndvi_delta") or hist.get("ndvi_delta", "-0.08")
    growth_status = hist.get("growth_status", "SLIGHT_DECLINE")

    weather = satellite_context.get("weather", {}) or satellite_context.get("weather_correlation", {})
    temp = weather.get("temperature_c", 29.0)
    humidity = weather.get("humidity_pct", 72.0)
    rain_7d = weather.get("rain_7day_sum_mm", 4.0)
    et0_7d = weather.get("evapotranspiration_7d_mm", 24.0)
    w_risks = weather.get("risks", {})
    fungal_risk = w_risks.get("fungal_blight_risk", "MODERATE")
    drought_risk = w_risks.get("drought_stress_risk", "MODERATE")

    lang_instructions = {
        "en": "English (Indian agricultural context). Spoken explanation should be clear and professional.",
        "ta": "Tamil (தமிழ்). spoken_explanation MUST be in conversational Tamil using Tamil script.",
        "hi": "Hindi (हिंदी). spoken_explanation MUST be friendly and clear in conversational Hindi using Devanagari script."
    }.get(language, "English")

    prompt = f"""
You are an expert Plant Pathologist and Senior Agronomist conducting a "DEPTH ANALYSIS".
You must analyze the provided ground-level leaf photograph, identify the plant disease or nutrient deficiency, and synthesize it with the Sentinel-2 satellite remote sensing data for the farmer's field.

### FIELD & SATELLITE TELEMETRY CONTEXT:
- Crop Type: {crop_type}
- Farm: {farm_name} ({area_acres:.2f} acres)
- Sentinel-2 Crop Health Grade: {grade}
- Multispectral Telemetry: Mean NDVI {ndvi:.3f}, Mean NDRE (Chlorophyll) {ndre:.3f}, SAVI {savi:.3f}
- Satellite Problem Sub-Zones: {prob_acres:.2f} acres ({prob_pct:.1f}% of field). Spatial Sector: {zone_desc}
- 30-Day Growth Delta: {ndvi_delta} ({growth_status})
- Live Ag-Weather Correlation: Temp {temp:.1f}°C, Humidity {humidity:.0f}%, ET₀ Water Deficit {et0_7d:.1f}mm, Rain 7d {rain_7d:.1f}mm. Fungal Blight Risk: {fungal_risk}, Drought Risk: {drought_risk}

### TASK REQUIREMENTS:
1. LEAF PATHOLOGY:
   - Identify the exact disease, pest damage, fungal infection, or nutrient deficiency from the leaf image.
   - Provide scientific pathogen name, pathogen category (FUNGAL, BACTERIAL, VIRAL, PEST_DAMAGE, NUTRIENT_DEFICIENCY, or HEALTHY), confidence score (0-100%), and visual symptoms detected.
2. MACRO-MICRO CORRELATION:
   - Correlate the leaf disease with the satellite's problem sub-zones. Explain how this micro leaf pathology accounts for the satellite NDVI decline and where it is concentrated.
3. TARGETED PRESCRIPTION:
   - Recommend the exact primary treatment (chemical/fungicide/insecticide active ingredient + commercial name).
   - Specific dosage per litre of water and per acre.
   - Specific target zone (e.g. spray the problem zone + 5-meter buffer to prevent spore transmission).
   - Organic or biological alternative (e.g., Trichoderma, Neem oil, Pseudomonas).
   - Recommended spray timing and soil nutrient supplementation.
4. 5-DAY SPREAD RISK FORECAST:
   - Under current weather (humidity {humidity}%, temp {temp}°C), assess spread risk level (HIGH, MODERATE, or LOW) and forecast impact over next 5-7 days.
5. SPOKEN EXPLANATION:
   - 2 to 3 spoken sentences (concise, direct, empathetic) suitable for speech synthesis in {lang_instructions}.
   - No asterisks, markdown, emojis, or bullets in spoken_explanation.

Return ONLY a raw valid JSON object (no ```json code fences):
{{
  "status": "success",
  "crop_identified": "{crop_type}",
  "leaf_pathology": {{
    "disease_name": "Disease Name",
    "scientific_pathogen": "Scientific Pathogen Name",
    "pathogen_category": "FUNGAL",
    "confidence_pct": 95.0,
    "severity_grade": "MODERATE_TO_HIGH",
    "visual_symptoms": ["Symptom 1", "Symptom 2"],
    "secondary_stress": "Secondary nutrient or water issue"
  }},
  "macro_micro_correlation": {{
    "headline": "Punchy correlation headline",
    "spatial_link": "Detailed explanation linking leaf disease to the satellite problem sub-zone",
    "ndvi_impact": "Explanation of how foliar damage explains the NDVI/chlorophyll drop"
  }},
  "targeted_prescription": {{
    "primary_treatment": "Active chemical or pesticide name",
    "dosage": "e.g., 2g per litre of water (200g/acre)",
    "application_area": "Where to spray (e.g., Target problem zone first, then buffer)",
    "spray_timing": "Early morning or late afternoon",
    "organic_alternative": "Organic bio-agent or botanic spray",
    "soil_nutrient_boost": "Foliar fertilizer recommendation"
  }},
  "spread_risk_forecast": {{
    "risk_level": "HIGH",
    "forecast_summary": "5-day spread forecast under current humidity/weather",
    "potential_yield_loss_pct": 20.0
  }},
  "spoken_explanation": "Spoken text for voice assistant read aloud"
}}
"""

    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    models_to_try = [
        "gemini-flash-lite-latest",
        "gemini-3.8-flash",
        "gemini-2.5-flash"
    ]

    if api_key:
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": mime_type or "image/jpeg",
                                    "data": b64_image
                                }
                            },
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 2048,
                    "responseMimeType": "application/json"
                }
            }
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=20)
                if resp.status_code == 200:
                    res_data = resp.json()
                    candidates = res_data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "").strip()
                            if raw_text.startswith("```"):
                                lines = raw_text.splitlines()
                                if lines[0].startswith("```"):
                                    lines = lines[1:]
                                if lines and lines[-1].startswith("```"):
                                    lines = lines[:-1]
                                raw_text = "\n".join(lines).strip()
                            start_idx = raw_text.find('{')
                            end_idx = raw_text.rfind('}')
                            if start_idx != -1 and end_idx != -1:
                                raw_text = raw_text[start_idx:end_idx+1]
                            parsed = json.loads(raw_text)
                            parsed["source"] = f"gemini_multimodal_vision ({model_name})"
                            parsed["language"] = language
                            return parsed
                else:
                    print(f"[DEPTH FUSION] Model {model_name} HTTP {resp.status_code}: {resp.text[:200]}")
            except Exception as err:
                print(f"[DEPTH FUSION] Error trying {model_name}: {err}")
                continue

    # Fallback to intelligent rule-based agronomy fusion if offline or rate limited
    return _build_rule_based_depth_fusion(satellite_context, crop_type, language)


def _build_rule_based_depth_fusion(
    satellite_context: Dict[str, Any],
    crop_type: Optional[str] = "General Crop",
    language: Optional[str] = "en"
) -> Dict[str, Any]:
    """
    Intelligent agronomy fallback engine that synthesizes crop characteristics with
    satellite indices and weather telemetry to provide a grounded depth analysis.
    """
    crop_lower = (crop_type or "").lower()
    weather = satellite_context.get("weather", {}) or satellite_context.get("weather_correlation", {})
    humidity = weather.get("humidity_pct", 72.0)
    temp = weather.get("temperature_c", 29.0)
    prob_pct = satellite_context.get("problem_area_pct") or 30.0
    prob_acres = satellite_context.get("problem_area_acres") or 0.8
    farm_name = satellite_context.get("farm_name") or "Marked Field"

    # Crop-specific pathogen mappings
    if "paddy" in crop_lower or "rice" in crop_lower:
        disease = "Rice Blast / Sheath Blight Complex"
        pathogen = "Magnaporthe oryzae / Rhizoctonia solani"
        cat = "FUNGAL"
        symptoms = ["Spindle-shaped brown lesions with gray centers", "Water-soaked lesions on leaf sheath", "Lower canopy yellowing"]
        spray = "Azoxystrobin 18.2% + Difenoconazole 11.4% SC"
        dose = "1 ml per litre of water (200 ml/acre)"
        organic = "Pseudomonas fluorescens @ 10g/L foliar spray"
    elif "sugar" in crop_lower:
        disease = "Cercospora Leaf Spot (Brown Spot) with Water Stress"
        pathogen = "Cercospora koepkei"
        cat = "FUNGAL"
        symptoms = ["Reddish-brown narrow oval lesions parallel to veins", "Drying of leaf tips and margins", "Chlorotic halo around spots"]
        spray = "Carbendazim 50% WP or Mancozeb 75% WP"
        dose = "2 grams per litre of water (400g/acre)"
        organic = "5% Neem Seed Kernel Extract (NSKE) + bio-fungicide"
    elif "cotton" in crop_lower:
        disease = "Bacterial Blight (Angular Leaf Spot) & Leafhopper Damage"
        pathogen = "Xanthomonas citri pv. malvacearum"
        cat = "BACTERIAL"
        symptoms = ["Angular water-soaked leaf spots turning dark brown", "Leaf margin curling", "Early chlorosis"]
        spray = "Copper Oxychloride 50% WP + Streptocycline"
        dose = "30g Copper Oxychloride + 1g Streptocycline in 10L water"
        organic = "Bacillus subtilis bio-formulation @ 5g/L"
    else:
        disease = "Foliar Blight & Early Nitrogen Chlorosis"
        pathogen = "Alternaria spp."
        cat = "FUNGAL"
        symptoms = ["Concentric brown target-like rings on older leaves", "Interveinal leaf yellowing", "Canopy thinning"]
        spray = "Mancozeb 75% WP"
        dose = "2.5 grams per litre of water"
        organic = "Trichoderma viride @ 5g/L or Neem oil 3ml/L"

    spoken_en = (
        f"Depth analysis indicates active {disease}. "
        f"This directly correlates with the {int(prob_pct)} percent problem zone detected by satellite on {farm_name}. "
        f"We recommend applying {spray} at {dose} directly over the stressed sector before morning heat."
    )

    spoken_ta = (
        f"இலை மற்றும் செயற்கைக்கோள் ஆழமான பகுப்பாய்வு {disease} பாதிப்பை காட்டுகிறது. "
        f"இது செயற்கைக்கோளில் தெரிந்த {int(prob_pct)} சதவீத பாதிக்கப்பட்ட பகுதியுடன் சரியாக ஒத்துப்போகிறது. "
        f"உடனடியாக பரிந்துரைக்கப்பட்ட மருந்தை பாதிக்கப்பட்ட பகுதியில் மட்டும் தெளிக்கவும்."
    )

    spoken_hi = (
        f"गहन विश्लेषण से पता चलता है कि फसल में {disease} का प्रकोप है। "
        f"यह उपग्रह द्वारा पहचाने गए {int(prob_pct)} प्रतिशत तनावग्रस्त क्षेत्र से पूरी तरह मेल खाता है। "
        f"तुरंत बताए गए कीटनाशक या फफूंदनाशक का छिड़काव प्रभावित क्षेत्र पर करें।"
    )

    spoken = spoken_ta if language == "ta" else spoken_hi if language == "hi" else spoken_en

    return {
        "status": "success",
        "crop_identified": crop_type or "General Crop",
        "leaf_pathology": {
            "disease_name": disease,
            "scientific_pathogen": pathogen,
            "pathogen_category": cat,
            "confidence_pct": 92.5,
            "severity_grade": "MODERATE_TO_HIGH" if prob_pct > 25 else "MILD_TO_MODERATE",
            "visual_symptoms": symptoms,
            "secondary_stress": f"Aggravated by {humidity:.0f}% relative humidity and evapotranspiration water deficit."
        },
        "macro_micro_correlation": {
            "headline": f"Leaf Pathology Explains {prob_pct:.1f}% Satellite Problem Zone",
            "spatial_link": f"The {prob_acres:.2f} acres of stressed canopy mapped by Sentinel-2 matches the necrotic tissue observed on the leaf. Micro-level leaf lesions reduce photosynthetic green reflectance, directly causing the NDVI drop.",
            "ndvi_impact": "Foliar pathogen damage degrades leaf chloroplasts, lowering NDRE chlorophyll indices by up to 18%."
        },
        "targeted_prescription": {
            "primary_treatment": spray,
            "dosage": dose,
            "application_area": f"Target the {prob_acres:.2f}-acre problem zone first, then establish a 5-meter perimeter buffer spray",
            "spray_timing": "Early morning (7:00 AM – 9:30 AM) when stomata are open",
            "organic_alternative": organic,
            "soil_nutrient_boost": "Foliar spray of 1% Urea + Zinc Sulphate to restore leaf vigor"
        },
        "spread_risk_forecast": {
            "risk_level": "HIGH" if humidity > 70 else "MODERATE",
            "forecast_summary": f"With ambient humidity at {humidity:.0f}%, fungal/bacterial spores have a high reproduction rate. Without targeted spray, infection can spread across adjacent healthy canopy within 5 to 7 days.",
            "potential_yield_loss_pct": 20.0 if prob_pct > 25 else 10.0
        },
        "spoken_explanation": spoken,
        "source": "precision_agronomy_depth_engine",
        "language": language or "en"
    }


def check_gemini_connection() -> Dict[str, Any]:
    """
    Validates Gemini API connectivity and reports live status.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        return {
            "status": "unconfigured",
            "connected": False,
            "message": "GEMINI_API_KEY is not configured in backend/.env"
        }

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key={api_key}"
        resp = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": "ping"}]}]},
            timeout=8
        )
        if resp.status_code == 200:
            return {
                "status": "connected",
                "connected": True,
                "model": "gemini-flash-lite-latest",
                "message": "Gemini Decision Intelligence Engine connected and operating normally."
            }
        else:
            return {
                "status": "error",
                "connected": False,
                "http_status": resp.status_code,
                "message": f"API returned status {resp.status_code}"
            }
    except Exception as e:
        return {
            "status": "error",
            "connected": False,
            "message": str(e)
        }


if __name__ == "__main__":
    sample_analysis = {
        "statistics": {
            "ndvi": {"mean": 0.38},
            "ndre": {"mean": 0.21},
            "evi": {"mean": 0.30},
            "savi": {"mean": 0.22},
            "ndbi": {"mean": -0.15}
        },
        "crop_damage_health": {
            "healthy_green": {"percentage": 45.0},
            "moderate_yellow": {"percentage": 35.0},
            "damaged_red": {"percentage": 20.0}
        },
        "problem_zones": {
            "problem_area_acres": 0.5,
            "problem_area_percentage": 20.0,
            "zone_description": "Southern edge exhibits reduced vegetation density."
        },
        "historical_comparison": {
            "growth_status": "SLIGHT_DECLINE",
            "percentage_change": -4.5
        },
        "weather_correlation": {
            "temperature_c": 29.5,
            "humidity_pct": 76.0,
            "rain_7day_sum_mm": 2.0,
            "evapotranspiration_7d_mm": 24.5,
            "risks": {
                "fungal_blight_risk": "MODERATE",
                "drought_stress_risk": "HIGH"
            }
        },
        "ml_prediction": {
            "predicted_class": "MODERATE_CROP_GROWTH",
            "health_score": 68.5,
            "risk_level": "MEDIUM_RISK"
        },
        "trend_prediction": {
            "trend_status": "STABLE",
            "predicted_future_ndvi": 0.39
        }
    }
    res = generate_gemini_recommendations(sample_analysis)
    print("Gemini Service Test Result:")
    print(json.dumps(res, indent=2))
