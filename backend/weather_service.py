import urllib.request
import json

def get_farm_weather_data(latitude, longitude):
    """
    Feature 3: Live Ag-Weather & Crop Health Correlation Service
    Queries Open-Meteo Free Ag-Weather API for exact farm coordinates.
    Returns: Temperature, Humidity, 7-Day Rainfall, Wind Speed, and Disease Risk Indicators.
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,rain,surface_pressure,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,rain_sum,et0_fao_evapotranspiration&timezone=auto"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'PrecisionAgriBot/1.0'})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            
            current = data.get("current", {})
            daily = data.get("daily", {})

            temp_c = current.get("temperature_2m", 28.0)
            humidity_pct = current.get("relative_humidity_2m", 65.0)
            rain_mm = current.get("rain", 0.0)
            wind_kmh = current.get("wind_speed_10m", 12.0)

            rain_sum_7d = sum(daily.get("rain_sum", [0.0]*7)[:7]) if daily.get("rain_sum") else 0.0
            et0_7d = sum(daily.get("et0_fao_evapotranspiration", [0.0]*7)[:7]) if daily.get("et0_fao_evapotranspiration") else 0.0

            # Disease Risk & Weather Stress Logic
            fungal_risk = "LOW"
            if humidity_pct >= 80.0 and 20.0 <= temp_c <= 30.0:
                fungal_risk = "HIGH"
            elif humidity_pct >= 70.0:
                fungal_risk = "MEDIUM"

            drought_risk = "LOW"
            if rain_sum_7d < 5.0 and temp_c >= 32.0:
                drought_risk = "HIGH"
            elif rain_sum_7d < 10.0:
                drought_risk = "MEDIUM"

            return {
                "status": "success",
                "temperature_c": round(float(temp_c), 1),
                "humidity_pct": round(float(humidity_pct), 1),
                "rain_current_mm": round(float(rain_mm), 1),
                "rain_7day_sum_mm": round(float(rain_sum_7d), 1),
                "evapotranspiration_7d_mm": round(float(et0_7d), 1),
                "wind_speed_kmh": round(float(wind_kmh), 1),
                "risks": {
                    "fungal_blight_risk": fungal_risk,
                    "drought_stress_risk": drought_risk,
                    "summary": f"7-Day Accumulated Rainfall is {round(rain_sum_7d, 1)} mm with {round(et0_7d, 1)} mm water loss."
                }
            }
    except Exception as e:
        print(f"[WEATHER SERVICE ERROR] {e}")
        # Reliable Fallback Data
        return {
            "status": "fallback",
            "temperature_c": 28.5,
            "humidity_pct": 68.0,
            "rain_current_mm": 0.0,
            "rain_7day_sum_mm": 12.4,
            "evapotranspiration_7d_mm": 18.2,
            "wind_speed_kmh": 10.5,
            "risks": {
                "fungal_blight_risk": "LOW",
                "drought_stress_risk": "LOW",
                "summary": "7-Day Accumulated Rainfall is 12.4 mm."
            }
        }
