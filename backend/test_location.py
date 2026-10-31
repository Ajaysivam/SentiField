import os
import ee
from dotenv import load_dotenv

load_dotenv()

project_id = os.getenv("GEE_PROJECT_ID")

try:
    ee.Initialize(project=project_id if (project_id and project_id.strip()) else None)
    print(f"[SUCCESS] Connected to Earth Engine (Project ID: '{project_id}')")
    
    # Coordinates (Namakkal, Tamil Nadu, India)
    # Earth Engine uses [Longitude, Latitude]
    lat = 11.2189
    lon = 78.1674
    point = ee.Geometry.Point([lon, lat])
    
    print(f"Querying Sentinel-2 images covering coordinates ({lat}, {lon})...")
    images = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(point)
        .filterDate("2026-01-01", "2026-08-17")
    )
    
    image_count = images.size().getInfo()
    print(f"[SUCCESS] Found {image_count} Sentinel-2 observations over coordinates ({lat}, {lon}).")
    
    if image_count > 0:
        first_img = images.first()
        img_id = first_img.get("system:index").getInfo()
        date = first_img.date().format("YYYY-MM-dd").getInfo()
        print(f"  * Sample Image ID: {img_id}")
        print(f"  * Acquisition Date: {date}")
except Exception as e:
    print(f"[ERROR] Querying location imagery: {e}")
