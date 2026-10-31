import os
import sys
import ee
from dotenv import load_dotenv

load_dotenv()

project_id = os.getenv("GEE_PROJECT_ID")

if not project_id or project_id.strip() == "":
    print("[WARNING] GEE_PROJECT_ID is not set in backend/.env file.")
    print("Please set GEE_PROJECT_ID in backend/.env file.\n")

print(f"Initializing Earth Engine with Project ID: '{project_id}'...")

try:
    ee.Initialize(project=project_id if (project_id and project_id.strip()) else None)
    print("[SUCCESS] Earth Engine initialized successfully!")
    print("Server Response:", ee.String("Earth Engine API is fully operational!").getInfo())
except Exception as e:
    print("[FAILED] to initialize Earth Engine.")
    print(f"Error details: {e}")
    print("\nTroubleshooting:")
    print("1. Ensure your Google Cloud Project has Earth Engine API enabled.")
    print("2. Set GEE_PROJECT_ID=your-project-id in backend/.env file.")
