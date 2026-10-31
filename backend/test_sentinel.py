import os
import ee
from dotenv import load_dotenv

load_dotenv()

project_id = os.getenv("GEE_PROJECT_ID")

try:
    ee.Initialize(project=project_id if (project_id and project_id.strip()) else None)
    print(f"[SUCCESS] Connected to Earth Engine (Project ID: '{project_id}')")
    
    print("Searching Sentinel-2 Harmonized Surface Reflectance collection...")
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterDate("2026-01-01", "2026-08-17")
    )
    
    count = collection.size().getInfo()
    print("[SUCCESS] Sentinel-2 collection query successful!")
    print(f"Total available images in date range: {count}")
except Exception as e:
    print(f"[ERROR] Querying Sentinel-2 collection: {e}")
