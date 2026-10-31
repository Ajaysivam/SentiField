import os
import datetime
import ee
from dotenv import load_dotenv

load_dotenv()

_gee_initialized = False

def initialize_gee():
    """
    Initializes Google Earth Engine securely on the FastAPI backend.
    """
    global _gee_initialized
    if _gee_initialized:
        return True

    project_id = os.getenv("GEE_PROJECT_ID", "crop-health-ai-505815")
    try:
        if project_id and project_id.strip():
            ee.Initialize(project=project_id.strip())
        else:
            ee.Initialize()
        _gee_initialized = True
        print(f"[GEE SERVICE] Successfully initialized Earth Engine with Project ID: '{project_id}'")
        return True
    except Exception as e:
        print(f"[GEE SERVICE ERROR] Failed to initialize Earth Engine: {e}")
        raise RuntimeError(f"Earth Engine initialization failed: {str(e)}")

def geojson_to_ee_geometry(geojson_feature):
    """
    Converts a GeoJSON Feature or Polygon Geometry into an Earth Engine ee.Geometry object.
    """
    initialize_gee()

    try:
        if isinstance(geojson_feature, dict):
            if geojson_feature.get("type") == "Feature":
                geometry_dict = geojson_feature.get("geometry", {})
            else:
                geometry_dict = geojson_feature
        else:
            geometry_dict = geojson_feature

        geom_type = geometry_dict.get("type")
        coords = geometry_dict.get("coordinates")

        if geom_type != "Polygon":
            raise ValueError(f"Unsupported geometry type '{geom_type}'. Must be 'Polygon'.")

        return ee.Geometry.Polygon(coords)
    except Exception as e:
        raise ValueError(f"Failed to convert GeoJSON to Earth Engine geometry: {str(e)}")

def get_gee_status():
    try:
        initialize_gee()
        test_str = ee.String("GEE Active").getInfo()
        return {
            "status": "connected",
            "project_id": os.getenv("GEE_PROJECT_ID", "crop-health-ai-505815"),
            "response": test_str
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

def get_latest_sentinel2_observation(geojson_feature):
    """
    Automatically retrieves metadata for the SINGLE MOST RECENT (LATEST) high-quality Sentinel-2 observation.
    Filters out cloudy observations (CLOUDY_PIXEL_PERCENTAGE <= 30%) with graceful fallbacks.
    """
    initialize_gee()
    ee_geometry = geojson_to_ee_geometry(geojson_feature)

    try:
        # Step 1: Query clean observations with <= 30% cloud cover
        clean_collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(ee_geometry)
            .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", 30))
            .sort("system:time_start", False)
        )

        first_img = clean_collection.first()
        info = first_img.getInfo() if first_img else None

        if not info:
            # Step 2: Fallback to <= 50% cloud cover
            mod_collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(ee_geometry)
                .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", 50))
                .sort("system:time_start", False)
            )
            first_mod = mod_collection.first()
            info = first_mod.getInfo() if first_mod else None

        if not info:
            # Step 3: Fallback to any recent pass if weather is overcast
            any_collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(ee_geometry)
                .sort("system:time_start", False)
            )
            first_any = any_collection.first()
            info = first_any.getInfo() if first_any else None

        if not info:
            return None

        properties = info.get("properties", {})
        img_id = info.get("id")
        sys_index = properties.get("system:index")
        time_start_ms = properties.get("system:time_start")

        acq_date = datetime.datetime.fromtimestamp(time_start_ms / 1000.0, tz=datetime.timezone.utc).strftime("%Y-%m-%d")
        acq_time = datetime.datetime.fromtimestamp(time_start_ms / 1000.0, tz=datetime.timezone.utc).strftime("%H:%M:%S UTC")
        spacecraft = properties.get("SPACECRAFT_NAME", "Sentinel-2")
        cloud_pct = round(float(properties.get("CLOUDY_PIXEL_PERCENTAGE", 0.0)), 1)

        return {
            "image_id": img_id,
            "system_index": sys_index,
            "acquisition_date": acq_date,
            "acquisition_time": acq_time,
            "spacecraft": spacecraft,
            "cloud_percentage": cloud_pct,
            "available_bands": ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"],
            "dataset": "COPERNICUS/S2_SR_HARMONIZED"
        }
    except Exception as e:
        raise RuntimeError(f"Failed to fetch latest Sentinel-2 image: {str(e)}")
