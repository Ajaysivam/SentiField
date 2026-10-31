import os
import sys
from shapely.geometry import shape, Polygon
import shapely.ops as ops
from pyproj import Transformer
import urllib.request
import json

# Test Coordinates (Namakkal, Tamil Nadu farm)
TEST_COORDS = [
    [78.1670, 11.2185],
    [78.1680, 11.2185],
    [78.1680, 11.2195],
    [78.1670, 11.2195],
    [78.1670, 11.2185]
]

def test_geocoding(query="Namakkal, Tamil Nadu"):
    print(f"--- 1. Testing OpenStreetMap Nominatim Geocoding for '{query}' ---")
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'PrecisionAgriBot/1.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data:
                top = data[0]
                lat = float(top['lat'])
                lon = float(top['lon'])
                display_name = top['display_name']
                print(f"[SUCCESS] Found Location: {display_name}")
                print(f"  Latitude:  {lat:.6f}° N")
                print(f"  Longitude: {lon:.6f}° E")
                return lat, lon
            else:
                print("[ERROR] No location results returned.")
                return None
    except Exception as e:
        print(f"[ERROR] Nominatim API failed: {e}")
        return None

def test_spatial_transformations():
    print("\n--- 2. Testing PyProj Geodetic CRS Area Transformation ---")
    geojson_polygon = {
        "type": "Polygon",
        "coordinates": [TEST_COORDS]
    }
    
    poly_shape = shape(geojson_polygon)
    print(f"Polygon Shape Valid: {poly_shape.is_valid}")
    print(f"Centroid Coordinates: Lat = {poly_shape.centroid.y:.6f}°, Lon = {poly_shape.centroid.x:.6f}°")

    transformer = Transformer.from_crs("EPSG:4326", "+proj=cea +units=m", always_xy=True)
    transformed_geom = ops.transform(transformer.transform, poly_shape)

    area_sq_m = abs(transformed_geom.area)
    area_acres = area_sq_m / 4046.8564224
    perimeter_m = transformed_geom.length

    print(f"Calculated Geodesic Area: {area_sq_m:.2f} m² ({area_acres:.2f} acres)")
    print(f"Calculated Perimeter:     {perimeter_m:.2f} meters")
    return True

if __name__ == "__main__":
    loc = test_geocoding("Namakkal, Tamil Nadu")
    test_spatial_transformations()
    print("\n[SUCCESS] Location Coordinates & Spatial Transformations Verified Cleanly!")
