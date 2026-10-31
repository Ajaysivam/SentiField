import os
import ee
from dotenv import load_dotenv

load_dotenv()
project_id = os.getenv("GEE_PROJECT_ID", "crop-health-ai-505815")

print("=== GOOGLE EARTH ENGINE AUTHENTICATION ===")
print("Opening browser for 1-click Google authorization...")

try:
    # Use localhost auth mode: automatically catches the browser login callback
    ee.Authenticate(auth_mode="localhost", force=True)
    ee.Initialize(project=project_id)
    print("\n[SUCCESS] Google Earth Engine authenticated & initialized successfully!")
    print("Project:", project_id)
except Exception as e:
    print(f"\n[WARNING] Localhost mode failed: {e}")
    print("Trying fallback auth mode...")
    try:
        ee.Authenticate(force=True)
        ee.Initialize(project=project_id)
        print("\n[SUCCESS] Google Earth Engine authenticated & initialized successfully!")
    except Exception as e2:
        print(f"\n[ERROR] Authentication failed: {e2}")

