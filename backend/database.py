import sqlite3
import os
import json
import datetime
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "farm_data.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        phone_number TEXT,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # Farms table (supports multiple farms per farmer)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        farm_name TEXT NOT NULL,
        crop_type TEXT DEFAULT 'General Crop',
        area_acres REAL NOT NULL,
        area_sq_m REAL NOT NULL,
        center_lat REAL NOT NULL,
        center_lon REAL NOT NULL,
        geojson TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """)

    # Farm analysis cache table (stores last satellite analysis JSON per farm)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farm_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER NOT NULL UNIQUE,
        analysis_json TEXT NOT NULL,
        completed_steps TEXT DEFAULT '{}',
        analyzed_at TEXT NOT NULL,
        FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE
    );
    """)

    # Pre-seed demo_farmer for instant 1-click test access
    cursor.execute("SELECT id FROM users WHERE username = 'demo_farmer'")
    user_row = cursor.fetchone()
    if not user_row:
        import hashlib
        salt = "a1b2c3d4e5f6789012345678abcdef01"
        pwd_hash = hashlib.pbkdf2_hmac('sha256', b'farm123', salt.encode('utf-8'), 100000).hex()
        now_ts = datetime.datetime.utcnow().isoformat()
        cursor.execute("""
        INSERT INTO users (username, phone_number, password_hash, salt, created_at)
        VALUES ('demo_farmer', '9876543210', ?, ?, ?)
        """, (pwd_hash, salt, now_ts))
        demo_uid = cursor.lastrowid
    else:
        demo_uid = user_row[0]

    # Ensure demo_farmer has 3 distinct sample farms with cached analyses for portfolio view
    cursor.execute("SELECT id FROM farms WHERE user_id = ?", (demo_uid,))
    existing_farms = cursor.fetchall()
    if len(existing_farms) < 3:
        now_ts = datetime.datetime.utcnow().isoformat()
        
        # Farm 1: Namakkal Precision Paddy Field (Healthy, Grade A)
        cursor.execute("SELECT id FROM farms WHERE user_id = ? AND farm_name LIKE '%Paddy%'", (demo_uid,))
        paddy_row = cursor.fetchone()
        if not paddy_row:
            f1_geojson = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [78.1465, 11.2305],
                        [78.1495, 11.2305],
                        [78.1495, 11.2335],
                        [78.1465, 11.2335],
                        [78.1465, 11.2305]
                    ]]
                },
                "properties": {"name": "Namakkal Precision Paddy Field"}
            }
            cursor.execute("""
            INSERT INTO farms (user_id, farm_name, crop_type, area_acres, area_sq_m, center_lat, center_lon, geojson, created_at)
            VALUES (?, 'Namakkal Precision Paddy Field', 'Paddy / Rice', 4.25, 17200.0, 11.2320, 78.1480, ?, ?)
            """, (demo_uid, json.dumps(f1_geojson), now_ts))
            f1_id = cursor.lastrowid
            
            f1_analysis = {
                "farm_session_id": f"DEMO_FARM_{f1_id}",
                "observation_details": {"acquisition_date": "2026-10-28", "spacecraft": "Sentinel-2B", "cloud_coverage_percentage": 1.2},
                "land_safety": {"is_farmland": True, "vegetation_density_score": 0.74},
                "historical_comparison": {
                    "historical_date": "2026-09-28", "historical_mean_ndvi": 0.58, "current_mean_ndvi": 0.74,
                    "growth_status": "VIGOROUS GROWTH", "percentage_change": 27.6, "ndvi_delta": "+0.16"
                },
                "problem_zones": {"problem_area_percentage": 8.4, "problem_area_acres": 0.36, "zone_description": "Minor nitrogen deficit detected along north-eastern irrigation border."},
                "weather_correlation": {
                    "temperature_c": 28.5, "humidity_pct": 68, "rain_7day_sum_mm": 18.2, "evapotranspiration_7d_mm": 24.5,
                    "risks": {"fungal_blight_risk": "LOW", "drought_stress_risk": "LOW", "summary": "Favorable micro-climate conditions. Soil moisture is within optimal range for paddy tillering."}
                },
                "trend_prediction": {"trend_status": "ACCELERATING_GROWTH", "prediction_confidence": 94, "current_ndvi": 0.74, "predicted_future_ndvi": 0.81, "summary": "Canopy development is on track for maximum yield index over the next 14-day cycle."},
                "crop_damage_health": {
                    "healthy_green": {"percentage": 82.5, "label": "Healthy Dense Canopy"},
                    "moderate_yellow": {"percentage": 12.0, "label": "Moderate Vigor"},
                    "damaged_red": {"percentage": 5.5, "label": "Stressed / Waterlogged Margin"}
                },
                "gemini_recommendations": {
                    "field_health_status": "HEALTHY", "model_used": "Gemini 2.5 Agro-Diagnostic Pro",
                    "executive_summary": {"overall_health_grade": "A", "headline": "Canopy vigor is excellent across 82.5% of parcel.", "farmer_friendly_message": "Crop tillering is developing strongly with balanced evapotranspiration. Address localized north-east perimeter."},
                    "categories": [
                        {"title": "Irrigation & Water Management", "status": "OPTIMAL", "icon": "💧", "summary": "7-day rainfall and soil moisture are balanced.", "specific_actions": ["Maintain 3-5 cm standing water during active vegetative growth phase.", "Ensure drainage channels along north-east bunds remain clear."]},
                        {"title": "Nutrient & Fertilizer Application", "status": "ATTENTION", "icon": "🧪", "summary": "Slight chlorophyll variance in north-east sector.", "specific_actions": ["Top-dress with Urea @ 25 kg/acre combined with Zinc Sulphate.", "Target application specifically to lower-vigor quadrant."]},
                        {"title": "Pest & Pathogen Surveillance", "status": "OPTIMAL", "icon": "🛡️", "summary": "Low humidity risk for fungal blast or sheath blight.", "specific_actions": ["Conduct routine scout checks at dawn for stem borer egg masses."]}
                    ],
                    "action_plan": {
                        "immediate_24_48h": [{"action": "Top-dress 25 kg/acre Urea in north-east zone", "reason": "Boost leaf nitrogen and chlorophyll density in flagged sub-zone"}],
                        "short_term_3_7d": [{"action": "Regulate irrigation to maintain 4 cm ponding", "reason": "Match upcoming 3-day dry interval"}],
                        "maintenance_8_14d": [{"action": "Re-evaluate satellite pass for canopy closure", "reason": "Verify NDVI progression beyond 0.80 benchmark"}]
                    },
                    "yield_impact": {"risk_if_no_action": "Potential 5-8% localized yield loss in untreated perimeter.", "potential_gain_with_action": "Complete recovery of sub-zone vigor within 7-10 days.", "estimated_recovery_days": 8}
                }
            }
            cursor.execute("INSERT OR REPLACE INTO farm_analysis (farm_id, analysis_json, completed_steps, analyzed_at) VALUES (?, ?, '{}', ?)", (f1_id, json.dumps(f1_analysis), now_ts))

        # Farm 2: East Sugarcane Belt (Critical Stress, Grade C)
        cursor.execute("SELECT id FROM farms WHERE user_id = ? AND farm_name LIKE '%Sugarcane%'", (demo_uid,))
        cane_row = cursor.fetchone()
        if not cane_row:
            f2_geojson = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [77.6820, 11.3120],
                        [77.6870, 11.3120],
                        [77.6870, 11.3170],
                        [77.6820, 11.3170],
                        [77.6820, 11.3120]
                    ]]
                },
                "properties": {"name": "East Sugarcane Belt"}
            }
            cursor.execute("""
            INSERT INTO farms (user_id, farm_name, crop_type, area_acres, area_sq_m, center_lat, center_lon, geojson, created_at)
            VALUES (?, 'East Sugarcane Belt', 'Sugarcane', 6.10, 24685.0, 11.3150, 77.6850, ?, ?)
            """, (demo_uid, json.dumps(f2_geojson), now_ts))
            f2_id = cursor.lastrowid
            
            f2_analysis = {
                "farm_session_id": f"DEMO_FARM_{f2_id}",
                "observation_details": {"acquisition_date": "2026-10-27", "spacecraft": "Sentinel-2A", "cloud_coverage_percentage": 2.5},
                "land_safety": {"is_farmland": True, "vegetation_density_score": 0.51},
                "historical_comparison": {
                    "historical_date": "2026-09-27", "historical_mean_ndvi": 0.56, "current_mean_ndvi": 0.49,
                    "growth_status": "VEGETATION STRESS / DECLINE", "percentage_change": -12.5, "ndvi_delta": "-0.07"
                },
                "problem_zones": {"problem_area_percentage": 28.5, "problem_area_acres": 1.74, "zone_description": "Severe moisture deficit and cane leaf scorch detected in south-western quadrant."},
                "weather_correlation": {
                    "temperature_c": 32.4, "humidity_pct": 44, "rain_7day_sum_mm": 3.2, "evapotranspiration_7d_mm": 35.8,
                    "risks": {"fungal_blight_risk": "MODERATE", "drought_stress_risk": "HIGH", "summary": "CRITICAL DROUGHT: 35.8mm water loss vastly outpaces 3.2mm rain. Permanent stalk stunting imminent."}
                },
                "trend_prediction": {"trend_status": "DECELERATING_STRESS", "prediction_confidence": 91, "current_ndvi": 0.49, "predicted_future_ndvi": 0.43, "summary": "Without immediate water intervention, cane wilting will expand across 50% of acreage in 5 days."},
                "crop_damage_health": {
                    "healthy_green": {"percentage": 48.2, "label": "Standing Cane"},
                    "moderate_yellow": {"percentage": 23.3, "label": "Moisture Stressed"},
                    "damaged_red": {"percentage": 28.5, "label": "Severely Stressed / Dry Leaves"}
                },
                "gemini_recommendations": {
                    "field_health_status": "CRITICAL_ATTENTION", "model_used": "Gemini 2.5 Agro-Diagnostic Pro",
                    "executive_summary": {"overall_health_grade": "C", "headline": "CRITICAL: 28.5% of sugarcane parcel in severe moisture deficit.", "farmer_friendly_message": "Immediate irrigation needed within 24 hours. The south-western 1.74 acres is rapidly losing biomass under high 35.8mm evaporative demand."},
                    "categories": [
                        {"title": "Irrigation & Water Management", "status": "CRITICAL", "icon": "💧", "summary": "Extreme water loss and soil drying.", "specific_actions": ["Run emergency furrow irrigation for 4 hours immediately.", "Clear intake channels to south-west sector."]},
                        {"title": "Nutrient & Fertilizer Application", "status": "ATTENTION", "icon": "🧪", "summary": "Potassium deficiency compounding drought stress.", "specific_actions": ["Apply foliar 1% Potassium Nitrate (KNO3) spray at sunset.", "Halt dry basal urea until soil is re-wetted."]},
                        {"title": "Pest & Pathogen Surveillance", "status": "ATTENTION", "icon": "🛡️", "summary": "Secondary red rot risk in stressed stalks.", "specific_actions": ["Scout nodal cane joints for red vascular discoloration."]}
                    ],
                    "action_plan": {
                        "immediate_24_48h": [
                            {"action": "🚨 Run emergency furrow irrigation for 4 hours on SW quadrant", "reason": "Stop irreversible cane moisture wilt (35.8mm ET0 water deficit)"},
                            {"action": "Spray foliar Potassium Nitrate (1%) at sunset", "reason": "Regulate stomata and reduce leaf scorch transpiration loss"}
                        ],
                        "short_term_3_7d": [{"action": "Apply trash mulching between cane rows", "reason": "Conserve soil moisture and cut evaporation by 40%"}],
                        "maintenance_8_14d": [{"action": "Sentinel-2 satellite revisit check for canopy recovery", "reason": "Target NDVI recovery back above 0.55"}]
                    },
                    "yield_impact": {"risk_if_no_action": "Permanent 20-25% tonnage reduction and reduced sucrose recovery.", "potential_gain_with_action": "Arrest leaf scorch and preserve 90%+ cane biomass.", "estimated_recovery_days": 10}
                }
            }
            cursor.execute("INSERT OR REPLACE INTO farm_analysis (farm_id, analysis_json, completed_steps, analyzed_at) VALUES (?, ?, '{}', ?)", (f2_id, json.dumps(f2_analysis), now_ts))

        # Farm 3: Salem Organic Cotton Plot (Good Vigor, Grade B+)
        cursor.execute("SELECT id FROM farms WHERE user_id = ? AND farm_name LIKE '%Cotton%'", (demo_uid,))
        cotton_row = cursor.fetchone()
        if not cotton_row:
            f3_geojson = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [78.1430, 11.6620],
                        [78.1480, 11.6620],
                        [78.1480, 11.6660],
                        [78.1430, 11.6660],
                        [78.1430, 11.6620]
                    ]]
                },
                "properties": {"name": "Salem Organic Cotton Plot"}
            }
            cursor.execute("""
            INSERT INTO farms (user_id, farm_name, crop_type, area_acres, area_sq_m, center_lat, center_lon, geojson, created_at)
            VALUES (?, 'Salem Organic Cotton Plot', 'Cotton', 3.80, 15380.0, 11.6640, 78.1460, ?, ?)
            """, (demo_uid, json.dumps(f3_geojson), now_ts))
            f3_id = cursor.lastrowid
            
            f3_analysis = {
                "farm_session_id": f"DEMO_FARM_{f3_id}",
                "observation_details": {"acquisition_date": "2026-10-26", "spacecraft": "Sentinel-2B", "cloud_coverage_percentage": 0.8},
                "land_safety": {"is_farmland": True, "vegetation_density_score": 0.67},
                "historical_comparison": {
                    "historical_date": "2026-09-26", "historical_mean_ndvi": 0.61, "current_mean_ndvi": 0.66,
                    "growth_status": "STEADY GROWTH", "percentage_change": 8.2, "ndvi_delta": "+0.05"
                },
                "problem_zones": {"problem_area_percentage": 5.1, "problem_area_acres": 0.19, "zone_description": "Uniform vegetative canopy across 94.9% of parcel. Trace weed competition along border row."},
                "weather_correlation": {
                    "temperature_c": 27.2, "humidity_pct": 72, "rain_7day_sum_mm": 14.5, "evapotranspiration_7d_mm": 22.0,
                    "risks": {"fungal_blight_risk": "LOW", "drought_stress_risk": "LOW", "summary": "Optimal growing climate. Balanced soil moisture supporting steady boll development."}
                },
                "trend_prediction": {"trend_status": "ACCELERATING_GROWTH", "prediction_confidence": 93, "current_ndvi": 0.66, "predicted_future_ndvi": 0.72, "summary": "Square formation and flowering phase on optimal track with high vigor."},
                "crop_damage_health": {
                    "healthy_green": {"percentage": 89.2, "label": "Vigorous Cotton Canopy"},
                    "moderate_yellow": {"percentage": 6.7, "label": "Border Margin"},
                    "damaged_red": {"percentage": 4.1, "label": "Localized Weed Patch"}
                },
                "gemini_recommendations": {
                    "field_health_status": "HEALTHY", "model_used": "Gemini 2.5 Agro-Diagnostic Pro",
                    "executive_summary": {"overall_health_grade": "B+", "headline": "Cotton square formation progressing smoothly with robust vegetative vigor.", "farmer_friendly_message": "Healthy stand with 89.2% prime canopy. Focus on prophylactic pest monitoring and maintaining clean borders."},
                    "categories": [
                        {"title": "Irrigation & Water Management", "status": "OPTIMAL", "icon": "💧", "summary": "Moisture levels favorable for boll setting.", "specific_actions": ["Continue light alternate-furrow irrigation cycle."]},
                        {"title": "Nutrient & Fertilizer Application", "status": "OPTIMAL", "icon": "🧪", "summary": "Balanced nitrogen-potash ratio.", "specific_actions": ["Prepare Boron (0.1%) foliar booster for peak flowering in 10 days."]},
                        {"title": "Pest & Pathogen Surveillance", "status": "OPTIMAL", "icon": "🛡️", "summary": "No active bollworm outbreak detected.", "specific_actions": ["Install 5 delta pheromone traps per acre.", "Conduct weekly morning scout checks."]}
                    ],
                    "action_plan": {
                        "immediate_24_48h": [{"action": "Install 5 delta pheromone traps across parcel borders", "reason": "Early warning surveillance for pink bollworm moths"}],
                        "short_term_3_7d": [{"action": "Perform light shallow weeding along perimeter rows", "reason": "Eliminate alternate weed hosts for sucking pests"}],
                        "maintenance_8_14d": [{"action": "Apply Boron 0.1% micronutrient spray", "reason": "Enhance flower retention and boll weight"}]
                    },
                    "yield_impact": {"risk_if_no_action": "Minimal risk; potential 3-5% boll shedding if pests enter undetected.", "potential_gain_with_action": "Sustain premium lint quality and target 18-20 quintals/acre yield.", "estimated_recovery_days": 5}
                }
            }
            cursor.execute("INSERT OR REPLACE INTO farm_analysis (farm_id, analysis_json, completed_steps, analyzed_at) VALUES (?, ?, '{}', ?)", (f3_id, json.dumps(f3_analysis), now_ts))

    conn.commit()
    conn.close()
    print(f"[DATABASE] Initialized SQLite database at '{DB_PATH}'")

# Helper functions for Users
def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, phone_number, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_user(username: str, password_hash: str, salt: str, phone_number: Optional[str] = None) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.datetime.utcnow().isoformat()
    cursor.execute(
        "INSERT INTO users (username, phone_number, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)",
        (username, phone_number, password_hash, salt, created_at)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return user_id

# Helper functions for Farms
def get_farms_by_user(user_id: int) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM farms WHERE user_id = ? ORDER BY id DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    farms = []
    for r in rows:
        f = dict(r)
        try:
            f["geojson"] = json.loads(f["geojson"])
        except Exception:
            pass
        farms.append(f)
    return farms

def get_farm_by_id(farm_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM farms WHERE id = ? AND user_id = ?", (farm_id, user_id))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    f = dict(row)
    try:
        f["geojson"] = json.loads(f["geojson"])
    except Exception:
        pass
    return f

def create_farm(
    user_id: int,
    farm_name: str,
    crop_type: str,
    area_acres: float,
    area_sq_m: float,
    center_lat: float,
    center_lon: float,
    geojson_data: Any
) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.datetime.utcnow().isoformat()
    geojson_str = json.dumps(geojson_data) if not isinstance(geojson_data, str) else geojson_data
    cursor.execute("""
        INSERT INTO farms (
            user_id, farm_name, crop_type, area_acres, area_sq_m,
            center_lat, center_lon, geojson, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, farm_name, crop_type, area_acres, area_sq_m,
        center_lat, center_lon, geojson_str, created_at
    ))
    farm_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return farm_id

def delete_farm(farm_id: int, user_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM farms WHERE id = ? AND user_id = ?", (farm_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def update_farm(
    farm_id: int,
    user_id: int,
    area_acres: float,
    area_sq_m: float,
    center_lat: float,
    center_lon: float,
    geojson_data: Any,
    farm_name: Optional[str] = None,
    crop_type: Optional[str] = None
) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    geojson_str = json.dumps(geojson_data) if not isinstance(geojson_data, str) else geojson_data
    if farm_name and crop_type:
        cursor.execute("""
            UPDATE farms
            SET farm_name = ?, crop_type = ?, area_acres = ?, area_sq_m = ?,
                center_lat = ?, center_lon = ?, geojson = ?
            WHERE id = ? AND user_id = ?
        """, (farm_name, crop_type, area_acres, area_sq_m, center_lat, center_lon, geojson_str, farm_id, user_id))
    else:
        cursor.execute("""
            UPDATE farms
            SET area_acres = ?, area_sq_m = ?, center_lat = ?, center_lon = ?, geojson = ?
            WHERE id = ? AND user_id = ?
        """, (area_acres, area_sq_m, center_lat, center_lon, geojson_str, farm_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# Helper functions for Farm Analysis Cache
def save_farm_analysis(farm_id: int, analysis_data: Any) -> bool:
    """Upsert the latest satellite analysis result for a given farm."""
    conn = get_db_connection()
    cursor = conn.cursor()
    analyzed_at = datetime.datetime.utcnow().isoformat()
    analysis_json = json.dumps(analysis_data)
    cursor.execute("""
        INSERT INTO farm_analysis (farm_id, analysis_json, analyzed_at)
        VALUES (?, ?, ?)
        ON CONFLICT(farm_id) DO UPDATE SET
            analysis_json = excluded.analysis_json,
            analyzed_at = excluded.analyzed_at
    """, (farm_id, analysis_json, analyzed_at))
    conn.commit()
    conn.close()
    return True

def get_farm_analysis(farm_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve the latest cached satellite analysis for a farm, if any."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM farm_analysis WHERE farm_id = ?", (farm_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    result = dict(row)
    try:
        result["analysis_data"] = json.loads(result["analysis_json"])
    except Exception:
        result["analysis_data"] = None
    try:
        result["completed_steps"] = json.loads(result.get("completed_steps") or "{}")
    except Exception:
        result["completed_steps"] = {}
    return result

def save_completed_steps(farm_id: int, completed_steps: Dict[str, Any]) -> bool:
    """Persist the farmer's completed timeline steps for a farm."""
    conn = get_db_connection()
    cursor = conn.cursor()
    steps_json = json.dumps(completed_steps)
    cursor.execute("""
        UPDATE farm_analysis SET completed_steps = ? WHERE farm_id = ?
    """, (steps_json, farm_id))
    conn.commit()
    conn.close()
    return True

# Initialize immediately when module is imported
init_db()
