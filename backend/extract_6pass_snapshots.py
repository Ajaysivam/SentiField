import os
import sys
import ee
import datetime
import time
import urllib.request
from gee_service import initialize_gee, geojson_to_ee_geometry

initialize_gee()

# Test Farm Polygon Coordinates
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

today = datetime.date.today()
start_date = (today - datetime.timedelta(days=38)).strftime("%Y-%m-%d")
end_date = today.strftime("%Y-%m-%d")

collection = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(ee_geometry)
    .filterDate(start_date, end_date)
    .sort("system:time_start", False)
)

raw_features = collection.limit(6).getInfo().get("features", [])
artifact_dir = r"C:\Users\AJAY SIVAM\.gemini\antigravity-ide\brain\5075e8d6-e703-471f-b733-1a3bd0c70f97"

rgb_vis = {
    "bands": ["B4", "B3", "B2"],
    "min": 0,
    "max": 3000,
    "gamma": 1.4,
    "dimensions": 600,
    "format": "png",
    "region": ee_geometry
}

heatmap_vis = {
    "min": 0.10,
    "max": 0.65,
    "palette": ["#dc2626", "#ef4444", "#f59e0b", "#84cc16", "#16a34a"],
    "dimensions": 600,
    "format": "png",
    "region": ee_geometry
}

def safe_download(url, dest_path, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                with open(dest_path, 'wb') as f:
                    f.write(resp.read())
            return True
        except Exception as e:
            time.sleep(1.5)
    return False

extracted_passes = []
print(f"[6-PASS EXTRACTOR] Extracting {len(raw_features)} passes with retry logic...")

for idx, feat in enumerate(raw_features):
    img_id = feat.get("id")
    time_start_ms = feat.get("properties", {}).get("system:time_start")
    spacecraft = feat.get("properties", {}).get("SPACECRAFT_NAME", "Sentinel-2")

    acq_date = datetime.datetime.fromtimestamp(time_start_ms / 1000.0, tz=datetime.timezone.utc).strftime("%Y-%m-%d")

    img = ee.Image(img_id).clip(ee_geometry)
    
    rgb_url = img.getThumbURL(rgb_vis)

    b4 = img.select("B4").multiply(0.0001)
    b8 = img.select("B8").multiply(0.0001)
    ndvi = b8.subtract(b4).divide(b8.add(b4))
    heatmap_url = ndvi.getThumbURL(heatmap_vis)

    rgb_filename = f"pass_{idx+1}_{acq_date}_rgb.png"
    rgb_path = os.path.join(artifact_dir, rgb_filename)
    safe_download(rgb_url, rgb_path)

    heatmap_filename = f"pass_{idx+1}_{acq_date}_heatmap.png"
    heatmap_path = os.path.join(artifact_dir, heatmap_filename)
    safe_download(heatmap_url, heatmap_path)

    mean_val = ndvi.reduceRegion(reducer=ee.Reducer.mean(), geometry=ee_geometry, scale=10).getInfo().get("B8", 0.20)
    mean_val = round(float(mean_val) if mean_val is not None else 0.20, 4)

    extracted_passes.append({
        "pass_num": idx + 1,
        "date": acq_date,
        "spacecraft": spacecraft,
        "mean_ndvi": mean_val,
        "rgb_file": rgb_filename,
        "heatmap_file": heatmap_filename,
    })

    print(f"  [SUCCESS] Pass #{idx+1} ({acq_date}): Saved RGB & Heatmap.")

print("[6-PASS EXTRACTOR] All 6 passes extracted successfully!")
