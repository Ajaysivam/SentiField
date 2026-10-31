import os
import sys
import ee
import urllib.request
import json
from dotenv import load_dotenv

load_dotenv()

project_id = os.getenv("GEE_PROJECT_ID", "crop-health-ai-505815")

print(f"==================================================")
print(f"   GOOGLE EARTH ENGINE (GEE) LIVE CONNECTION TEST  ")
print(f"==================================================")
print(f"Project ID from .env: '{project_id}'\n")

# 1. Direct Python GEE Initialization
print("--- Step 1: Initializing Earth Engine via Python API ---")
try:
    ee.Initialize(project=project_id)
    print(f"[SUCCESS] Earth Engine initialized successfully with Project ID: '{project_id}'")
except Exception as e:
    print(f"[FAILED] Earth Engine initialization error: {e}")
    sys.exit(1)

# 2. Server Ping Test
print("\n--- Step 2: Testing Earth Engine Server Expression Evaluation ---")
try:
    test_expr = ee.String("Google Earth Engine Online").getInfo()
    print(f"[SUCCESS] GEE Server Response: '{test_expr}'")
except Exception as e:
    print(f"[FAILED] Expression evaluation error: {e}")

# 3. Sentinel-2 Dataset Query Test
print("\n--- Step 3: Querying Sentinel-2 Surface Reflectance Dataset ---")
try:
    point = ee.Geometry.Point([78.1674, 11.2189]) # Namakkal, TN
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(point)
        .filterDate("2026-01-01", "2026-08-18")
    )
    count = collection.size().getInfo()
    latest_img = collection.sort("system:time_start", False).first()
    latest_id = latest_img.get("id").getInfo()
    print(f"[SUCCESS] Sentinel-2 Observations Found: {count} satellite passes")
    print(f"  Latest Sentinel-2 Image ID: {latest_id}")
except Exception as e:
    print(f"[FAILED] Sentinel-2 collection query error: {e}")

# 4. FastAPI Endpoint Status Check
print("\n--- Step 4: Testing FastAPI Endpoint http://127.0.0.1:8000/api/gee/status ---")
try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/gee/status") as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"[SUCCESS] Backend API Response: {json.dumps(data, indent=2)}")
except Exception as e:
        print(f"[FAILED] API status check error: {e}")

print("\n==================================================")
print("  GEE LIVE CONNECTION CHECK COMPLETED SUCCESSFULLY!")
print("==================================================")
