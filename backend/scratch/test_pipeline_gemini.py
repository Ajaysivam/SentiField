import sys
import json
import os

sys.path.insert(0, os.path.abspath('.'))

from gemini_service import generate_gemini_recommendations
from report_generator import generate_pdf_report

sample_analysis = {
    "farm_session_id": "FARM_TEST_2026_GEMINI",
    "observation_details": {
        "acquisition_date": "2026-09-15",
        "spacecraft": "Sentinel-2A"
    },
    "land_safety": {
        "is_farmland": True,
        "category": "AGRICULTURAL_FIELD"
    },
    "statistics": {
        "ndvi": {"mean": 0.36},
        "ndre": {"mean": 0.19},
        "evi": {"mean": 0.28},
        "savi": {"mean": 0.17},
        "ndbi": {"mean": -0.18}
    },
    "crop_damage_health": {
        "healthy_green": {"percentage": 42.0},
        "moderate_yellow": {"percentage": 38.0},
        "damaged_red": {"percentage": 20.0}
    },
    "problem_zones": {
        "problem_area_acres": 0.65,
        "problem_area_percentage": 20.0,
        "zone_description": "South-western quadrant displays canopy stress."
    },
    "historical_comparison": {
        "growth_status": "DECLINING",
        "percentage_change": -6.2,
        "historical_date": "2026-08-16",
        "historical_mean_ndvi": 0.42,
        "current_mean_ndvi": 0.36
    },
    "weather_correlation": {
        "status": "success",
        "temperature_c": 31.2,
        "humidity_pct": 78.0,
        "rain_7day_sum_mm": 1.5,
        "evapotranspiration_7d_mm": 26.8,
        "risks": {
            "fungal_blight_risk": "HIGH",
            "drought_stress_risk": "HIGH",
            "summary": "High heat (31.2°C) with elevated humidity (78%) increases fungal leaf blight vulnerability."
        }
    },
    "ml_prediction": {
        "predicted_class": "MODERATE_CROP_GROWTH",
        "health_score": 62.4,
        "risk_level": "MEDIUM_RISK"
    },
    "trend_prediction": {
        "trend_status": "SLIGHT_DECLINE",
        "predicted_future_ndvi": 0.34,
        "summary": "14-day AI forecast predicts potential further vegetation reduction without water/nutrient input."
    }
}

print("Running Gemini AI recommendations generator test...")
gemini_recs = generate_gemini_recommendations(sample_analysis)
sample_analysis["gemini_recommendations"] = gemini_recs

print("\n================ GEMINI AI RECOMMENDATIONS RESULT ================")
print(json.dumps(gemini_recs, indent=2))

print("\nGenerating test PDF report...")
pdf_path = os.path.abspath("reports/TEST_GEMINI_REPORT.pdf")
generate_pdf_report(sample_analysis, pdf_path)

print(f"\n[VERIFICATION SUCCESS] PDF Report generated at: {pdf_path}")
