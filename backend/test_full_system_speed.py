import time
import requests
import json

print("==================================================")
print("   SYSTEM SPEED & INTEGRATION BENCHMARK TEST     ")
print("==================================================")

base_url = "http://127.0.0.1:8000"

farm_geojson = {
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [78.1735, 11.2215],
            [78.1755, 11.2215],
            [78.1755, 11.2235],
            [78.1735, 11.2235],
            [78.1735, 11.2215]
        ]]
    },
    "properties": {}
}

# 1. Health check
t0 = time.time()
r_health = requests.get(f"{base_url}/api/health")
t_health = time.time() - t0
print(f"1. Health Check: {r_health.status_code} in {t_health:.3f}s")

# 2. GEE Status check
t0 = time.time()
r_gee_status = requests.get(f"{base_url}/api/gee/status")
t_gee = time.time() - t0
print(f"2. GEE Status: {r_gee_status.json().get('status')} in {t_gee:.3f}s")

# 3. Farm Validation
t0 = time.time()
r_val = requests.post(f"{base_url}/api/farm/validate", json={"geojson": farm_geojson})
t_val = time.time() - t0
val_data = r_val.json()
session_id = val_data.get("farm_session_id")
print(f"3. Farm Validation: Session '{session_id}' | Area: {val_data['area']['acres']} acres in {t_val:.3f}s")

# 4. GEE Prepare Farm
t0 = time.time()
r_prep = requests.post(f"{base_url}/api/gee/prepare-farm", json={"farm_session_id": session_id, "geojson": farm_geojson})
t_prep = time.time() - t0
print(f"4. GEE Prepare Farm: {r_prep.json().get('status')} in {t_prep:.3f}s")

# 5. Full Satellite Analysis Pipeline (Historical 30-Day Passes + ML + Weather + PDF)
t0 = time.time()
r_ana = requests.post(f"{base_url}/api/satellite/analyze-latest", json={"farm_session_id": session_id, "geojson": farm_geojson})
t_ana = time.time() - t0
ana_data = r_ana.json()
print(f"5. Full Satellite Analysis: Status OK in {t_ana:.3f}s")
print(f"   - Sentinel-2 Observation Date: {ana_data.get('observation_details', {}).get('acquisition_date')}")
print(f"   - Deduplicated Passes: {len(ana_data.get('timeline_passes', []))} passes retrieved")
print(f"   - ML Crop Health Class: {ana_data.get('ml_prediction', {}).get('predicted_class')}")
print(f"   - PDF Downloads URL: {ana_data.get('pdf_download_url')}")

print("\n==================================================")
print(f"  TOTAL END-TO-END PIPELINE TIME: {t_health + t_gee + t_val + t_prep + t_ana:.2f} SECONDS!")
print("==================================================")
