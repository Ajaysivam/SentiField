import os
import sys
import ee
import urllib.request
from gee_service import initialize_gee, geojson_to_ee_geometry

initialize_gee()

# Test Farm Polygon (Namakkal, Tamil Nadu)
farm_geojson = {
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [78.1670, 11.2185],
                [78.1685, 11.2185],
                [78.1685, 11.2198],
                [78.1670, 11.2198],
                [78.1670, 11.2185]
            ]
        ]
    }
}

ee_geometry = geojson_to_ee_geometry(farm_geojson)

# Retrieve latest Sentinel-2 observation
collection = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(ee_geometry)
    .sort("system:time_start", False)
)

latest_img = collection.first().clip(ee_geometry)
acq_date = datetime_str = ee.Date(latest_img.get("system:time_start")).format("YYYY-MM-dd").getInfo()

# Bands & Indices
b4 = latest_img.select("B4").multiply(0.0001)
b8 = latest_img.select("B8").multiply(0.0001)
ndvi = b8.subtract(b4).divide(b8.add(b4))

# Visual Parameters for Red/Green Crop Health Heatmap
vis_params = {
    "min": 0.10,
    "max": 0.65,
    "palette": ["#dc2626", "#ef4444", "#f59e0b", "#84cc16", "#16a34a"],
    "dimensions": 600,
    "format": "png",
    "region": ee_geometry
}

thumb_url = ndvi.getThumbURL(vis_params)
print(f"[GEE SNAPSHOT] Generated Thumbnail URL:\n{thumb_url}")

# Save image file to artifacts directory
artifact_dir = r"C:\Users\AJAY SIVAM\.gemini\antigravity-ide\brain\5075e8d6-e703-471f-b733-1a3bd0c70f97"
output_png = os.path.join(artifact_dir, "gee_farm_crop_health_snapshot.png")

urllib.request.urlretrieve(thumb_url, output_png)
print(f"[GEE SNAPSHOT] Image saved cleanly to: '{output_png}'")
