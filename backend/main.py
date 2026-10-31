import os
import uuid
import json
import datetime
from fastapi import FastAPI, HTTPException, status, Depends, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from shapely.geometry import shape, Polygon
import shapely.ops as ops
from pyproj import Transformer
from dotenv import load_dotenv

from database import (
    get_user_by_username, get_user_by_id, create_user,
    get_farms_by_user, get_farm_by_id, create_farm, delete_farm, update_farm,
    save_farm_analysis, get_farm_analysis, save_completed_steps
)
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_optional_current_user
)
from gee_service import initialize_gee, geojson_to_ee_geometry, get_gee_status, get_latest_sentinel2_observation
from indices import process_farm_satellite_analysis
from ml_model import ml_pipeline
from weather_service import get_farm_weather_data
from report_generator import generate_pdf_report
from gemini_service import (
    generate_gemini_recommendations,
    check_gemini_connection,
    generate_voice_agronomist_reply,
    analyze_leaf_depth_fusion
)

load_dotenv()


app = FastAPI(
    title="SENTIFIELD AI — Autonomous Multispectral Crop Health Diagnostics",
    description="Enterprise Backend API featuring Historical Growth Comparisons, Field Zoning, Live Weather Correlation, and 14-Day AI Trend Forecasting.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class GeoJSONGeometry(BaseModel):
    type: str
    coordinates: List[Any]

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: Optional[Dict[str, Any]] = {}

class FarmValidationRequest(BaseModel):
    geojson: GeoJSONFeature
    expected_area_acres: Optional[float] = None

class GEEPrepareRequest(BaseModel):
    farm_session_id: str
    geojson: GeoJSONFeature

class LatestAnalysisRequest(BaseModel):
    farm_session_id: str
    geojson: GeoJSONFeature

class RegisterRequest(BaseModel):
    username: str
    password: str
    phone_number: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class SaveFarmRequest(BaseModel):
    farm_name: str
    crop_type: Optional[str] = "General Crop"
    geojson: GeoJSONFeature
    area_acres: Optional[float] = None
    area_sq_m: Optional[float] = None

class UpdateFarmRequest(BaseModel):
    geojson: GeoJSONFeature
    farm_name: Optional[str] = None
    crop_type: Optional[str] = None
    area_acres: Optional[float] = None
    area_sq_m: Optional[float] = None

class SaveAnalysisRequest(BaseModel):
    analysis_data: Dict[str, Any]

class SaveStepsRequest(BaseModel):
    completed_steps: Dict[str, Any]

class VoiceAgentRequest(BaseModel):
    question: str
    context_mode: Optional[str] = "combined"  # "combined" or "single"
    farm_id: Optional[str] = None
    language: Optional[str] = "en"
    client_context: Optional[Dict[str, Any]] = None

class DepthAnalysisJSONRequest(BaseModel):
    image_base64: str
    crop_type: Optional[str] = "General Crop"
    satellite_context: Optional[Dict[str, Any]] = None
    language: Optional[str] = "en"

# ==================== FARMER AUTHENTICATION & MULTI-FARM ROUTES ====================

@app.post("/api/auth/register")
def register_farmer(req: RegisterRequest):
    username = req.username.strip()
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long.")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")
    
    existing = get_user_by_username(username)
    if existing:
        raise HTTPException(status_code=400, detail="A farmer account with this username already exists.")
    
    pwd_hash, salt = hash_password(req.password)
    user_id = create_user(username=username, password_hash=pwd_hash, salt=salt, phone_number=req.phone_number)
    token = create_access_token(user_id=user_id, username=username)
    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user_id,
            "username": username,
            "phone_number": req.phone_number
        }
    }

@app.post("/api/auth/login")
def login_farmer(req: LoginRequest):
    username = req.username.strip()
    user = get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    
    if not verify_password(req.password, user["password_hash"], user["salt"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    
    token = create_access_token(user_id=user["id"], username=user["username"])
    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "phone_number": user.get("phone_number")
        }
    }

@app.get("/api/auth/me")
def get_farmer_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    user = get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="Farmer account not found.")
    return {"status": "success", "user": user}

@app.get("/api/farms")
def list_saved_farms(current_user: Dict[str, Any] = Depends(get_current_user)):
    farms = get_farms_by_user(current_user["user_id"])
    return {"status": "success", "farms": farms}

@app.post("/api/farms")
def save_farmer_farm(req: SaveFarmRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    geom_dict = req.geojson.geometry.model_dump()
    poly_shape = shape(geom_dict)
    
    centroid = poly_shape.centroid
    center_lat = centroid.y
    center_lon = centroid.x
    
    if req.area_sq_m and req.area_acres:
        area_sq_m = req.area_sq_m
        area_acres = req.area_acres
    else:
        transformer = Transformer.from_crs("EPSG:4326", "+proj=cea +units=m", always_xy=True)
        transformed_geom = ops.transform(transformer.transform, poly_shape)
        area_sq_m = abs(transformed_geom.area)
        area_acres = area_sq_m / 4046.8564224

    farm_id = create_farm(
        user_id=current_user["user_id"],
        farm_name=req.farm_name.strip() or "My Farm Plot",
        crop_type=req.crop_type.strip() if req.crop_type else "General Crop",
        area_acres=round(area_acres, 2),
        area_sq_m=round(area_sq_m, 2),
        center_lat=round(center_lat, 6),
        center_lon=round(center_lon, 6),
        geojson_data=req.geojson.model_dump()
    )
    return {
        "status": "success",
        "farm_id": farm_id,
        "message": f"Farm '{req.farm_name}' successfully saved to farmer profile!"
    }

@app.delete("/api/farms/{farm_id}")
def remove_saved_farm(farm_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    success = delete_farm(farm_id, current_user["user_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Farm not found or already deleted.")
    return {"status": "success", "message": "Farm successfully removed."}

@app.put("/api/farms/{farm_id}")
def update_farmer_farm(farm_id: int, req: UpdateFarmRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    farm = get_farm_by_id(farm_id, current_user["user_id"])
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")

    geom_dict = req.geojson.geometry.model_dump()
    poly_shape = shape(geom_dict)
    centroid = poly_shape.centroid
    center_lat = centroid.y
    center_lon = centroid.x

    if req.area_sq_m and req.area_acres:
        area_sq_m = req.area_sq_m
        area_acres = req.area_acres
    else:
        transformer = Transformer.from_crs("EPSG:4326", "+proj=cea +units=m", always_xy=True)
        transformed_geom = ops.transform(transformer.transform, poly_shape)
        area_sq_m = abs(transformed_geom.area)
        area_acres = area_sq_m / 4046.8564224

    success = update_farm(
        farm_id=farm_id,
        user_id=current_user["user_id"],
        area_acres=round(area_acres, 2),
        area_sq_m=round(area_sq_m, 2),
        center_lat=round(center_lat, 6),
        center_lon=round(center_lon, 6),
        geojson_data=req.geojson.model_dump(),
        farm_name=req.farm_name or farm.get("farm_name"),
        crop_type=req.crop_type or farm.get("crop_type")
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update farm boundary.")

    return {
        "status": "success",
        "message": f"Farm '{req.farm_name or farm.get('farm_name')}' location updated successfully!"
    }

@app.get("/api/farms/portfolio/summary")
def get_farmer_portfolio_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Enterprise Combined Farm Operations & Priority Command Center:
    Aggregates all farm parcels owned by the farmer, analyzes cached satellite telemetry,
    ranks problem zones and weather stress, and produces an optimal, prioritized cross-farm
    action roadmap ('which farm to do what one by one').
    """
    farms = get_farms_by_user(current_user["user_id"])
    if not farms:
        return {
            "status": "empty",
            "total_farms": 0,
            "total_acres": 0.0,
            "critical_count": 0,
            "attention_count": 0,
            "optimal_count": 0,
            "farms": [],
            "ranked_action_items": [],
            "top_suggestion": "No farms registered yet. Click 'Draw New Farm' to add your first plot."
        }

    total_acres = sum(f.get("area_acres", 0.0) for f in farms)
    critical_count = 0
    attention_count = 0
    optimal_count = 0
    analyzed_count = 0
    
    farms_summary = []
    all_action_items = []

    for f in farms:
        farm_id = f["id"]
        cached = get_farm_analysis(farm_id)
        analysis_data = cached.get("analysis_data") if cached else None
        completed_steps = cached.get("completed_steps", {}) if cached else {}
        analyzed_at = cached.get("analyzed_at") if cached else None

        if not analysis_data:
            farms_summary.append({
                "farm_id": farm_id,
                "farm_name": f["farm_name"],
                "crop_type": f.get("crop_type", "General Crop"),
                "area_acres": f.get("area_acres", 0.0),
                "center_lat": f.get("center_lat"),
                "center_lon": f.get("center_lon"),
                "has_analysis": False,
                "health_grade": "—",
                "urgency_level": "PENDING_ANALYSIS",
                "urgency_score": 0,
                "ndvi": None,
                "ndvi_delta": None,
                "problem_area_pct": 0.0,
                "weather_risks": {},
                "analyzed_at": None,
                "top_priority_step": "Run Satellite Analysis to assess field health",
                "headline": "No satellite data recorded yet"
            })
            continue

        analyzed_count += 1
        recs = analysis_data.get("gemini_recommendations", {})
        exec_sum = recs.get("executive_summary", {})
        if isinstance(exec_sum, dict):
            grade = exec_sum.get("overall_health_grade", "B")
            headline = exec_sum.get("headline", "")
        else:
            grade = recs.get("field_health_status", "B")
            headline = str(exec_sum)

        hist = analysis_data.get("historical_comparison", {})
        ndvi = hist.get("current_mean_ndvi", 0.0)
        ndvi_delta = hist.get("ndvi_delta", "+0.00")
        growth_status = hist.get("growth_status", "NORMAL")

        prob = analysis_data.get("problem_zones", {})
        prob_pct = prob.get("problem_area_percentage", 0.0)
        prob_acres = prob.get("problem_area_acres", 0.0)

        weather = analysis_data.get("weather_correlation", {})
        w_risks = weather.get("risks", {})
        drought_risk = w_risks.get("drought_stress_risk", "LOW")
        fungal_risk = w_risks.get("fungal_blight_risk", "LOW")

        # Determine urgency score and category
        urgency_score = prob_pct
        if drought_risk == "HIGH":
            urgency_score += 40
        elif drought_risk == "MODERATE":
            urgency_score += 15

        if fungal_risk == "HIGH":
            urgency_score += 35
        elif fungal_risk == "MODERATE":
            urgency_score += 15

        if grade in ["C", "C-", "D", "F"]:
            urgency_score += 30
        elif grade in ["B-", "C+"]:
            urgency_score += 15

        if ndvi and ndvi < 0.50:
            urgency_score += 20

        if urgency_score >= 45 or prob_pct >= 20.0 or drought_risk == "HIGH" or grade in ["C", "C-", "D", "F"]:
            urgency_level = "CRITICAL"
            critical_count += 1
        elif urgency_score >= 20 or prob_pct >= 8.0:
            urgency_level = "ATTENTION"
            attention_count += 1
        else:
            urgency_level = "OPTIMAL"
            optimal_count += 1

        # Extract Action Plan items
        action_plan = recs.get("action_plan", {})
        top_step_for_farm = None
        if isinstance(action_plan, dict):
            # 1. Immediate 24-48h
            for idx, item in enumerate(action_plan.get("immediate_24_48h", [])):
                if isinstance(item, dict):
                    step_key = f"farm_{farm_id}_imm_{idx}"
                    if not top_step_for_farm:
                        top_step_for_farm = item.get("action")
                    all_action_items.append({
                        "step_key": step_key,
                        "farm_id": farm_id,
                        "farm_name": f["farm_name"],
                        "crop_type": f.get("crop_type", "General Crop"),
                        "timeframe": "Next 24-48 Hours",
                        "timeframe_order": 1,
                        "urgency_level": urgency_level,
                        "action": item.get("action", ""),
                        "reason": item.get("reason", ""),
                        "is_completed": bool(completed_steps.get(step_key) or completed_steps.get(f"immediate_{idx}")),
                        "priority_rank_score": 1000 + urgency_score - idx
                    })

            # 2. Short-term 3-7d
            for idx, item in enumerate(action_plan.get("short_term_3_7d", [])):
                if isinstance(item, dict):
                    step_key = f"farm_{farm_id}_short_{idx}"
                    all_action_items.append({
                        "step_key": step_key,
                        "farm_id": farm_id,
                        "farm_name": f["farm_name"],
                        "crop_type": f.get("crop_type", "General Crop"),
                        "timeframe": "Days 3-7",
                        "timeframe_order": 2,
                        "urgency_level": urgency_level,
                        "action": item.get("action", ""),
                        "reason": item.get("reason", ""),
                        "is_completed": bool(completed_steps.get(step_key) or completed_steps.get(f"short_{idx}")),
                        "priority_rank_score": 500 + urgency_score - idx
                    })

            # 3. Maintenance 8-14d
            for idx, item in enumerate(action_plan.get("maintenance_8_14d", [])):
                if isinstance(item, dict):
                    step_key = f"farm_{farm_id}_maint_{idx}"
                    all_action_items.append({
                        "step_key": step_key,
                        "farm_id": farm_id,
                        "farm_name": f["farm_name"],
                        "crop_type": f.get("crop_type", "General Crop"),
                        "timeframe": "Days 8-14",
                        "timeframe_order": 3,
                        "urgency_level": urgency_level,
                        "action": item.get("action", ""),
                        "reason": item.get("reason", ""),
                        "is_completed": bool(completed_steps.get(step_key) or completed_steps.get(f"maint_{idx}")),
                        "priority_rank_score": 100 + urgency_score - idx
                    })

        farms_summary.append({
            "farm_id": farm_id,
            "farm_name": f["farm_name"],
            "crop_type": f.get("crop_type", "General Crop"),
            "area_acres": f.get("area_acres", 0.0),
            "center_lat": f.get("center_lat"),
            "center_lon": f.get("center_lon"),
            "has_analysis": True,
            "health_grade": grade,
            "urgency_level": urgency_level,
            "urgency_score": round(urgency_score, 1),
            "ndvi": ndvi,
            "ndvi_delta": ndvi_delta,
            "growth_status": growth_status,
            "problem_area_pct": prob_pct,
            "problem_area_acres": prob_acres,
            "weather_risks": {
                "drought": drought_risk,
                "fungal": fungal_risk,
                "temp": weather.get("temperature_c"),
                "humidity": weather.get("humidity_pct")
            },
            "analyzed_at": analyzed_at,
            "top_priority_step": top_step_for_farm or "Continue monitoring vegetative health",
            "headline": headline
        })

    # Sort farms by urgency (highest urgency first)
    farms_summary.sort(key=lambda x: x.get("urgency_score", 0), reverse=True)

    # Sort action items by priority (highest score first)
    all_action_items.sort(key=lambda x: x.get("priority_rank_score", 0), reverse=True)

    # Assign 1-based sequential rank to action items
    for idx, item in enumerate(all_action_items):
        item["priority_rank"] = idx + 1

    # Formulate overall top suggestion
    highest_farm = farms_summary[0] if farms_summary else None
    if highest_farm and highest_farm.get("urgency_level") == "CRITICAL":
        top_suggestion = f"🚨 URGENT: Focus immediate operations on '{highest_farm['farm_name']}' ({highest_farm['crop_type']}). It has {highest_farm.get('problem_area_pct', 0)}% stressed canopy and high water deficit. Action: {highest_farm.get('top_priority_step')}"
    elif highest_farm and highest_farm.get("urgency_level") == "ATTENTION":
        top_suggestion = f"⚠️ Primary focus for today: Address '{highest_farm['farm_name']}' ({highest_farm['crop_type']}). Recommended step: {highest_farm.get('top_priority_step')}"
    else:
        top_suggestion = f"✅ All monitored farm parcels are in healthy vigor. Follow routine irrigation scheduling and scout border rows."

    return {
        "status": "ok",
        "total_farms": len(farms),
        "total_acres": round(total_acres, 2),
        "critical_count": critical_count,
        "attention_count": attention_count,
        "optimal_count": optimal_count,
        "analyzed_count": analyzed_count,
        "highest_priority_farm": highest_farm,
        "top_suggestion": top_suggestion,
        "ranked_action_items": all_action_items,
        "farms": farms_summary
    }

@app.get("/api/farms/{farm_id}/analysis")
def get_farm_cached_analysis(farm_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Return the last cached satellite analysis for a saved farm."""
    farm = get_farm_by_id(farm_id, current_user["user_id"])
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")
    cached = get_farm_analysis(farm_id)
    if not cached:
        return {"status": "no_analysis", "analysis_data": None, "completed_steps": {}, "analyzed_at": None}
    return {
        "status": "ok",
        "analysis_data": cached.get("analysis_data"),
        "completed_steps": cached.get("completed_steps", {}),
        "analyzed_at": cached.get("analyzed_at")
    }

@app.post("/api/farms/{farm_id}/analysis/save")
def save_farm_cached_analysis(farm_id: int, req: SaveAnalysisRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Save (or update) the satellite analysis result for a saved farm."""
    farm = get_farm_by_id(farm_id, current_user["user_id"])
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")
    save_farm_analysis(farm_id, req.analysis_data)
    return {"status": "success", "message": "Analysis saved to farm profile."}

@app.post("/api/farms/{farm_id}/steps")
def update_completed_steps(farm_id: int, req: SaveStepsRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Persist the farmer's completed priority timeline steps."""
    farm = get_farm_by_id(farm_id, current_user["user_id"])
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")
    save_completed_steps(farm_id, req.completed_steps)
    return {"status": "success", "message": "Progress saved."}

@app.get("/")
def read_root():
    return {
        "system": "AI-Based Precision Agriculture and Crop Health Monitoring System",
        "status": "Online",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    gemini_stat = check_gemini_connection()
    return {
        "status": "ok",
        "service": "SENTIFIELD AI Engine",
        "timestamp_status": "Healthy",
        "gemini_ai": gemini_stat,
        "backend": "FastAPI",
        "version": "1.0.0"
    }

@app.get("/db", response_class=HTMLResponse)
def view_database_dashboard():
    """
    Visual Database Browser & Explorer for SENTIFIELD AI SQLite Database.
    """
    import sqlite3
    from database import DB_PATH

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    users = cur.execute("SELECT id, username, phone_number, created_at FROM users ORDER BY id ASC").fetchall()
    farms = cur.execute("""
        SELECT f.id, f.user_id, u.username, f.farm_name, f.crop_type, f.area_acres, 
               f.area_sq_m, f.center_lat, f.center_lon, f.created_at, f.geojson
        FROM farms f
        LEFT JOIN users u ON f.user_id = u.id
        ORDER BY f.id DESC
    """).fetchall()
    conn.close()

    total_acres = sum(f["area_acres"] for f in farms) if farms else 0.0

    users_rows = ""
    for u in users:
        users_rows += f"""
        <tr>
            <td style="font-weight: 700; color: #00f5a0;">#{u['id']}</td>
            <td style="font-weight: 600; color: #ffffff;">👤 {u['username']}</td>
            <td style="color: #94a3b8;">{u['phone_number'] or '—'}</td>
            <td style="color: #cbd5e1; font-size: 0.82rem;">{u['created_at'][:19].replace('T', ' ')}</td>
        </tr>
        """

    farms_rows = ""
    for f in farms:
        farms_rows += f"""
        <tr>
            <td style="font-weight: 700; color: #00d9f5;">#{f['id']}</td>
            <td><span style="background: rgba(0, 245, 160, 0.12); color: #00f5a0; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">{f['username'] or f['user_id']}</span></td>
            <td style="font-weight: 700; color: #ffffff;">🌾 {f['farm_name']}</td>
            <td><span style="background: rgba(255, 183, 3, 0.15); color: #ffb703; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">{f['crop_type']}</span></td>
            <td style="font-weight: 700; color: #00f5a0;">{f['area_acres']:.2f} ac</td>
            <td style="color: #94a3b8; font-size: 0.82rem;">{f['center_lat']:.4f}, {f['center_lon']:.4f}</td>
            <td style="color: #cbd5e1; font-size: 0.82rem;">{f['created_at'][:19].replace('T', ' ')}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SENTIFIELD AI — SQLite Database Explorer</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            * {{ box-sizing: border-box; margin: 0; padding: 0; }}
            body {{
                font-family: 'Plus Jakarta Sans', sans-serif;
                background: #030712;
                color: #e2e8f0;
                padding: 2.5rem 1.5rem;
                min-height: 100vh;
            }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            .header {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 1rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                margin-bottom: 2rem;
            }}
            .title-wrap h1 {{
                font-family: 'Outfit', sans-serif;
                font-size: 1.85rem;
                font-weight: 800;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 0.6rem;
            }}
            .title-wrap p {{ font-size: 0.88rem; color: #94a3b8; margin-top: 0.3rem; }}
            .stats-bar {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 1rem;
                margin-bottom: 2.5rem;
            }}
            .stat-card {{
                background: rgba(8, 16, 32, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 14px;
                padding: 1.25rem 1.5rem;
            }}
            .stat-card .label {{ font-size: 0.78rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; }}
            .stat-card .val {{ font-size: 1.8rem; font-weight: 800; color: #00f5a0; margin-top: 0.3rem; font-family: 'Outfit', sans-serif; }}
            .table-card {{
                background: rgba(8, 16, 32, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 1.5rem;
                margin-bottom: 2.5rem;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            }}
            .table-header {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1.25rem;
            }}
            .table-title {{
                font-family: 'Outfit', sans-serif;
                font-size: 1.25rem;
                font-weight: 700;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }}
            .badge-count {{
                background: rgba(0, 217, 245, 0.15);
                color: #00d9f5;
                padding: 0.2rem 0.6rem;
                border-radius: 9999px;
                font-size: 0.78rem;
                font-weight: 800;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 0.9rem;
            }}
            th {{
                background: rgba(15, 23, 42, 0.8);
                color: #94a3b8;
                font-size: 0.76rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-weight: 700;
                padding: 0.85rem 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }}
            td {{
                padding: 0.85rem 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }}
            tr:hover td {{ background: rgba(255, 255, 255, 0.02); }}
            .btn-action {{
                background: linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%);
                color: #030712;
                font-weight: 700;
                padding: 0.55rem 1.1rem;
                border-radius: 10px;
                text-decoration: none;
                font-size: 0.88rem;
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
            }}
            .file-path-chip {{
                background: rgba(15, 23, 42, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.12);
                padding: 0.35rem 0.75rem;
                border-radius: 8px;
                font-size: 0.78rem;
                color: #cbd5e1;
                font-family: monospace;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="title-wrap">
                    <h1>🗄️ SENTIFIELD AI Database Explorer</h1>
                    <p>Live SQLite Inspection: <span class="file-path-chip">{DB_PATH}</span></p>
                </div>
                <div style="display: flex; gap: 0.75rem; align-items: center;">
                    <a href="/db" class="btn-action" style="background: rgba(255, 255, 255, 0.1); color: #fff;">🔄 Refresh</a>
                    <a href="http://localhost:5173/" class="btn-action">🚀 Open App Dashboard</a>
                </div>
            </div>

            <div class="stats-bar">
                <div class="stat-card">
                    <div class="label">Registered Farmers</div>
                    <div class="val">{len(users)}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Saved Farm Plots</div>
                    <div class="val" style="color: #00d9f5;">{len(farms)}</div>
                </div>
                <div class="stat-card">
                    <div class="label">Total Monitored Area</div>
                    <div class="val" style="color: #ffb703;">{total_acres:.2f} <span style="font-size: 1rem; color: #94a3b8;">acres</span></div>
                </div>
            </div>

            <!-- TABLE 1: USERS -->
            <div class="table-card">
                <div class="table-header">
                    <div class="table-title">
                        <span>👨‍🌾 Table: `users`</span>
                        <span class="badge-count">{len(users)} Records</span>
                    </div>
                </div>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Farmer Username</th>
                                <th>Phone Number</th>
                                <th>Account Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users_rows or '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 2rem;">No farmers registered yet.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- TABLE 2: FARMS -->
            <div class="table-card">
                <div class="table-header">
                    <div class="table-title">
                        <span>🌾 Table: `farms`</span>
                        <span class="badge-count" style="background: rgba(0, 245, 160, 0.15); color: #00f5a0;">{len(farms)} Saved Plots</span>
                    </div>
                </div>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Farm ID</th>
                                <th>Farmer Owner</th>
                                <th>Farm Name</th>
                                <th>Crop Type</th>
                                <th>Area (Acres)</th>
                                <th>Center Coordinates</th>
                                <th>Saved Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {farms_rows or '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">No farm plots saved yet.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return html

@app.get("/api/gemini/status")
def gemini_status_check():
    """
    Dedicated endpoint to verify Gemini AI connection and model readiness.
    """
    return check_gemini_connection()

@app.get("/api/gee/status")
def gee_status():
    return get_gee_status()

@app.post("/api/farm/validate")
def validate_farm_polygon(request: FarmValidationRequest):
    """
    Validates farm polygon geometry, checks for self-intersections,
    computes exact geodetic area (m², hectares, acres) and perimeter.
    """
    try:
        geom_dict = request.geojson.geometry.model_dump()
        poly_shape = shape(geom_dict)

        if not isinstance(poly_shape, Polygon):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid farm geometry. Input shape must be a valid Polygon."
            )

        if not poly_shape.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid farm boundary polygon. Polygon coordinates self-intersect or form an unclosed ring."
            )

        centroid = poly_shape.centroid
        center_lat = centroid.y
        center_lon = centroid.x

        transformer = Transformer.from_crs("EPSG:4326", "+proj=cea +units=m", always_xy=True)
        transformed_geom = ops.transform(transformer.transform, poly_shape)
        
        area_sq_meters = abs(transformed_geom.area)
        perimeter_meters = transformed_geom.length
        
        area_hectares = area_sq_meters / 10000.0
        area_acres = area_sq_meters / 4046.8564224

        if area_sq_meters < 10.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Farm boundary polygon is too small (< 10 m²). Please draw a larger farm area."
            )

        session_id = f"FARM_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6].upper()}"

        warning_message = None
        if request.expected_area_acres and request.expected_area_acres > 0:
            diff = abs(area_acres - request.expected_area_acres)
            if diff > 0.25 * request.expected_area_acres:
                warning_message = f"Expected area ({request.expected_area_acres:.2f} acres) differs from calculated polygon area ({area_acres:.2f} acres)."

        return {
            "status": "valid",
            "farm_session_id": session_id,
            "center": {
                "latitude": round(center_lat, 6),
                "longitude": round(center_lon, 6)
            },
            "area": {
                "sq_meters": round(area_sq_meters, 2),
                "hectares": round(area_hectares, 4),
                "acres": round(area_acres, 2)
            },
            "perimeter": {
                "meters": round(perimeter_meters, 2)
            },
            "warning": warning_message,
            "geojson": request.geojson.model_dump(),
            "timestamp": datetime.datetime.now().isoformat()
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process farm polygon geometry: {str(e)}"
        )

@app.post("/api/gee/prepare-farm")
def prepare_gee_farm(request: GEEPrepareRequest):
    """
    Converts confirmed farm GeoJSON polygon into an Earth Engine geometry object.
    """
    try:
        geom_dict = request.geojson.geometry.model_dump()
        ee_geometry = geojson_to_ee_geometry(geom_dict)

        ee_area_sq_m = ee_geometry.area().getInfo()
        bounds_coords = ee_geometry.bounds().coordinates().getInfo()

        return {
            "status": "gee_ready",
            "farm_session_id": request.farm_session_id,
            "gee_project_id": os.getenv("GEE_PROJECT_ID", "crop-health-ai-505815"),
            "ee_geometry_type": ee_geometry.type().getInfo(),
            "ee_area_sq_meters": round(ee_area_sq_m, 2),
            "ee_area_acres": round(ee_area_sq_m / 4046.8564224, 2),
            "bounds": bounds_coords,
            "message": "Farm boundary successfully integrated into Google Earth Engine server environment."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google Earth Engine Integration Error: {str(e)}"
        )

@app.post("/api/satellite/analyze-latest")
def analyze_latest_sentinel_data(request: LatestAnalysisRequest):
    """
    Enterprise Satellite Pipeline featuring:
    1. Historical 30-Day Crop Health Comparison & Growth Delta.
    2. Spatial Field Zoning & Problem Sub-Zone Detection.
    3. Live Weather + Crop Health Correlation (Open-Meteo API).
    4. 14-Day Machine Learning Crop Health Trend Forecasting.
    5. Land Safety Guardrails & Red/Green Crop Damage Overlay Maps.
    """
    try:
        geom_dict = request.geojson.geometry.model_dump()
        poly_shape = shape(geom_dict)
        center_lat = poly_shape.centroid.y
        center_lon = poly_shape.centroid.x

        # 1. Retrieve latest Sentinel-2 observation
        latest_obs = get_latest_sentinel2_observation(geom_dict)
        if not latest_obs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No Sentinel-2 satellite observation found covering the selected polygon."
            )

        # 2. Run GEE Satellite Analysis (Historical Comparison, Field Zoning, 14-Day Trend Prediction)
        analysis_result = process_farm_satellite_analysis(
            geojson_feature=geom_dict,
            image_id=latest_obs["image_id"]
        )

        analysis_result["farm_session_id"] = request.farm_session_id
        analysis_result["observation_details"] = latest_obs

        # 3. Feature 3: Live Weather + Crop Health Correlation
        weather_data = get_farm_weather_data(latitude=center_lat, longitude=center_lon)
        analysis_result["weather_correlation"] = weather_data

        # 4. Evaluate Random Forest Machine Learning Model Prediction
        stats = analysis_result.get("statistics", {})
        transformer = Transformer.from_crs("EPSG:4326", "+proj=cea +units=m", always_xy=True)
        transformed_geom = ops.transform(transformer.transform, poly_shape)
        exact_acres = transformed_geom.area / 4046.8564224

        ml_pred = ml_pipeline.predict_crop_health(
            ndvi_mean=stats.get("ndvi", {}).get("mean", 0.0),
            ndre_mean=stats.get("ndre", {}).get("mean", 0.0),
            evi_mean=stats.get("evi", {}).get("mean", 0.0),
            savi_mean=stats.get("savi", {}).get("mean", 0.0),
            ndbi_mean=stats.get("ndbi", {}).get("mean", 0.0),
            area_acres=exact_acres
        )
        analysis_result["ml_prediction"] = ml_pred

        # 5. Generate Gemini AI Agronomic Recommendations
        gemini_recs = generate_gemini_recommendations(analysis_result)
        analysis_result["gemini_recommendations"] = gemini_recs

        # 6. Compile Executive PDF Report
        backend_dir = os.path.dirname(__file__)
        reports_dir = os.path.join(backend_dir, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        pdf_path = os.path.join(reports_dir, f"{request.farm_session_id}.pdf")
        generate_pdf_report(analysis_result, pdf_path)
        analysis_result["pdf_download_url"] = f"/api/reports/download/{request.farm_session_id}"

        return analysis_result

    except HTTPException as he:
        print(f"[HTTP EXCEPTION] {he.detail}")
        raise he
    except Exception as e:
        import traceback
        print(f"[ANALYZE ERROR] Exception occurred in analyze_latest_sentinel_data:")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Latest Satellite Analysis Execution Error: {str(e)}"
        )

@app.get("/api/reports/download/{farm_session_id}")
def download_pdf_report(farm_session_id: str):
    """
    Downloads executive PDF report for the specified farm session ID.
    Checks backend/reports as well as root reports folder.
    """
    backend_dir = os.path.dirname(__file__)
    file_path = os.path.join(backend_dir, "reports", f"{farm_session_id}.pdf")
    if not os.path.exists(file_path):
        root_path = os.path.abspath(os.path.join(backend_dir, "..", "reports", f"{farm_session_id}.pdf"))
        if os.path.exists(root_path):
            file_path = root_path
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PDF report for farm session '{farm_session_id}' not found."
            )

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"Crop_Health_Report_{farm_session_id}.pdf"
    )

@app.post("/api/ai/voice-agent")
def voice_agronomist_agent(
    req: VoiceAgentRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Interactive Voice-to-Voice & Chat Agronomist:
    Takes the farmer's spoken or typed question, pulls the analyzed telemetry
    (single farm or portfolio), and generates natural spoken speech text and rich
    chat transcript content.
    """
    context: Dict[str, Any] = {}
    
    # 1. Start with client-supplied context if available (e.g. active view on dashboard or analyzed plot)
    if req.client_context and isinstance(req.client_context, dict):
        context.update(req.client_context)

    # 2. Augment with user database data if authenticated
    if current_user:
        if req.farm_id:
            farm = get_farm_by_id(req.farm_id, current_user["user_id"])
            if farm:
                context["context_mode"] = "single"
                context["farm_name"] = farm.get("farm_name")
                context["crop_type"] = farm.get("crop_type")
                context["area_acres"] = farm.get("area_acres")
                cached = get_farm_analysis(req.farm_id)
                if cached and cached.get("analysis_data"):
                    an_data = cached["analysis_data"]
                    context["ndvi"] = an_data.get("historical_comparison", {}).get("current_mean_ndvi", 0.0)
                    context["ndvi_delta"] = an_data.get("historical_comparison", {}).get("ndvi_delta", "+0.00")
                    context["growth_status"] = an_data.get("historical_comparison", {}).get("growth_status", "NORMAL")
                    recs = an_data.get("gemini_recommendations", {})
                    exec_sum = recs.get("executive_summary", {})
                    if isinstance(exec_sum, dict):
                        context["health_grade"] = exec_sum.get("overall_health_grade", "B")
                    else:
                        context["health_grade"] = "B"
                    context["problem_area_pct"] = an_data.get("problem_zones", {}).get("problem_area_percentage", 0.0)
                    context["problem_area_acres"] = an_data.get("problem_zones", {}).get("problem_area_acres", 0.0)
                    context["zone_description"] = an_data.get("problem_zones", {}).get("zone_description", "")
                    context["weather"] = an_data.get("weather_correlation", {})
                    context["action_plan"] = an_data.get("gemini_recommendations", {}).get("action_plan", {})
        elif req.context_mode == "combined":
            # Aggregate authenticated portfolio context
            portfolio = get_farmer_portfolio_summary(current_user)
            context["context_mode"] = "combined"
            context["total_farms"] = portfolio.get("total_farms", 0)
            context["total_acres"] = portfolio.get("total_acres", 0.0)
            context["critical_count"] = portfolio.get("critical_count", 0)
            context["attention_count"] = portfolio.get("attention_count", 0)
            context["optimal_count"] = portfolio.get("optimal_count", 0)
            context["top_suggestion"] = portfolio.get("top_suggestion", "")
            context["ranked_action_items"] = portfolio.get("ranked_action_items", [])
            context["farms"] = portfolio.get("farms", [])

    # 3. Context mode isolation: if single plot mode, ensure no combined portfolio contamination
    if req.context_mode == "single":
        context["context_mode"] = "single"
        context.pop("ranked_action_items", None)
        context.pop("farms", None)
        context.pop("total_farms", None)
    elif req.context_mode == "combined" and not context.get("farms") and not current_user:
        # Fallback portfolio demo only if explicitly requested combined mode with no auth
        context["context_mode"] = "combined"
        context["total_farms"] = 3
        context["total_acres"] = 8.5
        context["critical_count"] = 1
        context["top_suggestion"] = "Emergency irrigation needed on East Sugarcane Block."
        context["ranked_action_items"] = [
            {"rank": "#1", "farm_name": "East Sugarcane Block", "urgency_level": "CRITICAL", "action": "Emergency Deep Irrigation", "reason": "38% moisture deficit"},
            {"rank": "#2", "farm_name": "Salem Cotton Field", "urgency_level": "ATTENTION", "action": "Foliar zinc & boron spray", "reason": "Canopy stabilization"},
            {"rank": "#3", "farm_name": "Namakkal Paddy Block", "urgency_level": "OPTIMAL", "action": "Maintain 3cm standing water", "reason": "Grade A peak tillering"}
        ]

    reply = generate_voice_agronomist_reply(
        question=req.question,
        context=context,
        language=req.language or "en"
    )
    return reply

@app.post("/api/ai/depth-analysis")
async def depth_analysis_endpoint(
    leaf_image: UploadFile = File(...),
    crop_type: Optional[str] = Form("General Crop"),
    satellite_context: Optional[str] = Form(None),
    language: Optional[str] = Form("en"),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    Unified Macro-to-Micro Crop Depth Analysis:
    Fuses ground-level leaf pathology computer vision with Sentinel-2 satellite
    multispectral indices (NDVI, NDRE, problem sub-zones) and ag-weather data.
    """
    image_bytes = await leaf_image.read()
    if not image_bytes or len(image_bytes) < 50:
        raise HTTPException(status_code=400, detail="Please upload a valid crop leaf image file.")

    mime_type = leaf_image.content_type or "image/jpeg"

    # Parse satellite context JSON if provided as string
    parsed_context = {}
    if satellite_context:
        try:
            parsed_context = json.loads(satellite_context)
        except Exception as e:
            print(f"[DEPTH ANALYSIS] Could not parse satellite_context JSON: {e}")

    result = analyze_leaf_depth_fusion(
        image_bytes=image_bytes,
        mime_type=mime_type,
        satellite_context=parsed_context,
        crop_type=crop_type,
        language=language or "en"
    )
    return result

@app.post("/api/ai/depth-analysis/json")
def depth_analysis_json_endpoint(
    req: DepthAnalysisJSONRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user)
):
    """
    JSON base64 interface for Depth Analysis:
    Fuses leaf photograph base64 image with Sentinel-2 multispectral telemetry.
    """
    b64_str = req.image_base64
    mime_type = "image/jpeg"
    if "," in b64_str:
        header, b64_str = b64_str.split(",", 1)
        if "png" in header:
            mime_type = "image/png"
        elif "webp" in header:
            mime_type = "image/webp"

    try:
        import base64
        image_bytes = base64.b64decode(b64_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid base64 image data.")

    result = analyze_leaf_depth_fusion(
        image_bytes=image_bytes,
        mime_type=mime_type,
        satellite_context=req.satellite_context or {},
        crop_type=req.crop_type or "General Crop",
        language=req.language or "en"
    )

    # Re-compile unified PDF report with dual-lens leaf pathology if session_id provided
    session_id = (req.satellite_context or {}).get("farm_session_id")
    if session_id:
        result["pdf_download_url"] = f"/api/reports/download/{session_id}"
        try:
            backend_dir = os.path.dirname(__file__)
            pdf_path = os.path.join(backend_dir, "reports", f"{session_id}.pdf")
            combined_pdf_data = dict(req.satellite_context or {})
            combined_pdf_data["farm_session_id"] = session_id
            combined_pdf_data["depth_analysis"] = result
            generate_pdf_report(combined_pdf_data, pdf_path)
            print(f"[DUAL-LENS PDF] Recompiled unified master PDF with leaf diagnosis: {pdf_path}")
        except Exception as pdf_err:
            print(f"[DUAL-LENS PDF] Could not recompile PDF: {pdf_err}")

    return result

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
