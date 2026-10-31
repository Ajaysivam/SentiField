# TECHNICAL SPECIFICATION & SYSTEM ARCHITECTURE REPORT
## AI-Based Precision Agriculture & Crop Health Monitoring System

---

## 1. Executive Summary & Technical Scope
The **AI-Based Precision Agriculture and Crop Health Monitoring System** is an enterprise-grade cloud GIS and machine learning application designed to process multispectral satellite imagery, calculate vegetation health indices, classify land-use safety guardrails, evaluate crop stress using ensemble Machine Learning (ML), and generate publication-grade PDF agronomic reports.

The system integrates **Google Earth Engine (GEE)** with **Sentinel-2 Surface Reflectance (`COPERNICUS/S2_SR_HARMONIZED`)** imagery to perform server-side spatial clipping, spectral band extraction ($B_2$ to $B_{12}$), mathematical index computations, and high-contrast map tile streaming.

---

## 2. System Architecture & Component Interactions

```text
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                      React 18 + Vite Web Application                              |
|   - Leaflet Interactive Map Engine with Google High-Res Satellite Tiles           |
|   - Unlimited Point-and-Click Polygon Drawer with Real-Time Turf.js Geodesic Math |
|   - High-Contrast Red (#dc2626) vs Green (#16a34a) Crop Health Map Overlays      |
|   - Plain-English Agronomic Recommendations & ML Stress Score Display             |
+----------------------------------------+------------------------------------------+
                                         | REST HTTP / JSON APIs
                                         v
+-----------------------------------------------------------------------------------+
|                                  BACKEND LAYER                                    |
|                             FastAPI + Python 3.10                                 |
|                                                                                   |
|  +---------------------------+  +--------------------------+  +----------------+ |
|  |  Shapely & PyProj Engine  |  |   GEE Service Connection |  | ML Model Engine| |
|  |  Geometry Validation &    |  |   Auth: crop-health-ai-  |  | Random Forest  | |
|  |  Geodesic Area Math (m²)  |  |         505815           |  | Classifier     | |
|  +---------------------------+  +--------------------------+  +----------------+ |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                   Indices Engine & Land Safety Check                        |  |
|  |  Calculates NDVI, NDRE, EVI, SAVI, NDBI & Rooftop Guardrails                  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                   ReportLab PDF Generation Service                          |  |
|  |  Compiles Executive PDF Report -> /api/reports/download/{session_id}        |  |
|  +-----------------------------------------------------------------------------+  |
+----------------------------------------+------------------------------------------+
                                         | GEE API / OAuth2
                                         v
+-----------------------------------------------------------------------------------+
|                                 SATELLITE DATA LAYER                              |
|                          Google Earth Engine Cloud                                |
|   Dataset: COPERNICUS/S2_SR_HARMONIZED (Sentinel-2A/2B/2C)                       |
|   Resolution: 10m Ground Sample Distance (GSD)                                    |
|   Operations: FilterBounds -> Sort(time) -> First() -> Clip(ee_geometry)          |
+-----------------------------------------------------------------------------------+
```

---

## 3. Mathematical & Algorithmic Formulations

### 3.1 Spectral Band Scaling
Sentinel-2 Surface Reflectance (SR) digital numbers are scaled by $10^{-4}$ to yield actual surface reflectance values ($\rho \in [0, 1]$):
$$\rho_b = \text{DN}_b \times 0.0001$$

Where $b \in \{B2, B3, B4, B5, B6, B7, B8, B8A, B11, B12\}$.

---

### 3.2 Multispectral Vegetation Indices

1. **Normalized Difference Vegetation Index (NDVI)**:
   $$\text{NDVI} = \frac{\rho_{\text{B8}} - \rho_{\text{B4}}}{\rho_{\text{B8}} + \rho_{\text{B4}}}$$

2. **Normalized Difference Red Edge Index (NDRE)** (Chlorophyll & Nitrogen Sensitivity):
   $$\text{NDRE} = \frac{\rho_{\text{B8}} - \rho_{\text{B5}}}{\rho_{\text{B8}} + \rho_{\text{B5}}}$$

3. **Enhanced Vegetation Index (EVI)** (High-Biomass Canopy Sensitivity):
   $$\text{EVI} = 2.5 \times \frac{\rho_{\text{B8}} - \rho_{\text{B4}}}{\rho_{\text{B8}} + 6\rho_{\text{B4}} - 7.5\rho_{\text{B2}} + 1}$$

4. **Soil-Adjusted Vegetation Index (SAVI)** (Soil Brightness Correction, $L=0.5$):
   $$\text{SAVI} = 1.5 \times \frac{\rho_{\text{B8}} - \rho_{\text{B4}}}{\rho_{\text{B8}} + \rho_{\text{B4}} + 0.5}$$

5. **Normalized Difference Built-Up Index (NDBI)** (Rooftop & Concrete Structure Detection):
   $$\text{NDBI} = \frac{\rho_{\text{B11}} - \rho_{\text{B8}}}{\rho_{\text{B11}} + \rho_{\text{B8}}}$$

---

### 3.3 Land Use Safety Guardrail Classifier
To prevent non-farmland structures (building rooftops, house structures, concrete roads) from receiving false crop health reports, the backend evaluates:

$$\text{Farmland Status} = \begin{cases} \text{FALSE (Non-Farmland Structure)}, & \text{if } \mu_{\text{NDVI}} < 0.12 \text{ or } \mu_{\text{NDBI}} > 0.05 \\ \text{TRUE (Active Agricultural Land)}, & \text{otherwise} \end{cases}$$

If $\text{Farmland Status}$ is `FALSE`, satellite crop analysis is halted and an explicit Land Safety Warning Alert is returned to the user interface.

---

### 3.4 Geodesic Area Calculation (PyProj & Turf.js)
Polygon vertex coordinates in Geographic WGS84 ($\text{EPSG:4326}$) are transformed to Cylindrical Equal Area projection ($\text{+proj=cea}$) to compute accurate planar geodesic area:

$$\text{Area}_{\text{m}^2} = \iint_{\text{Polygon}} dA$$
$$\text{Area}_{\text{acres}} = \frac{\text{Area}_{\text{m}^2}}{4046.8564224}$$
$$\text{Area}_{\text{hectares}} = \frac{\text{Area}_{\text{m}^2}}{10000.0}$$

---

## 4. Machine Learning Model Architecture (`ml_model.py`)

### 4.1 Model Pipeline
* **Preprocessing**: `StandardScaler` feature z-score normalization:
  $$z = \frac{x - \mu}{\sigma}$$
* **Classifier**: `RandomForestClassifier` ensemble with $N_{\text{estimators}} = 200$, $\text{max\_depth} = 10$, $\text{min\_samples\_split} = 4$, and balanced class weighting.
* **Training Dataset**: 2,000 multispectral samples spanning 4 target classes.

### 4.2 Feature Importances Weighting
```text
  - NDVI (Veg Density):           29.3%
  - NDRE (Chlorophyll):           25.3%
  - SAVI (Soil Adjusted):         20.7%
  - EVI (Canopy Structure):       20.2%
  - NDBI (Built-Up Index):         4.5%
  - Farm Area (Acres):             0.0%
```

---

## 5. API Endpoint Architecture & Methods

| HTTP Method | Endpoint Route | Request Payload | Technical Function |
|---|---|---|---|
| `GET` | `/api/health` | None | API service status & health verification |
| `GET` | `/api/gee/status` | None | GEE authentication & connection state |
| `POST` | `/api/farm/validate` | `GeoJSONFeature`, `expected_area` | Shapely validation, CRS projection math & Session ID creation |
| `POST` | `/api/gee/prepare-farm` | `farm_session_id`, `GeoJSONFeature` | Converts GeoJSON to `ee.Geometry.Polygon` |
| `POST` | `/api/crop-health/predict` | Multispectral feature vector | Evaluates Random Forest ML model |
| `POST` | `/api/satellite/analyze-latest` | `farm_session_id`, `GeoJSONFeature` | GEE clipping, band extraction, Red/Green tile generation, ML prediction, and PDF compilation |
| `GET` | `/api/reports/download/{id}` | Path parameter: `farm_session_id` | Streams binary `application/pdf` report download |

---

## 6. Directory Structure & Source Code Hierarchy

```text
c:/College Work/Fin_pro/
├── backend/
│   ├── main.py                     # FastAPI Application Entrypoint & REST Routes
│   ├── gee_service.py              # Google Earth Engine Service & GeoJSON Converters
│   ├── indices.py                  # Multispectral Engine, Land Safety Check, & Red/Green Maps
│   ├── ml_model.py                 # Scikit-Learn Random Forest Classifier Pipeline
│   ├── report_generator.py         # ReportLab PDF Report Compilation Engine
│   ├── test_location_validation.py # Unit Test Suite for Coordinates & CRS Projections
│   ├── requirements.txt            # Python Dependency Manifest
│   ├── .env                        # Environment Configuration (GEE_PROJECT_ID)
│   └── reports/                    # Compiled PDF Farm Reports Directory
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx          # Top Navigation Bar & API Status Badges
│   │   │   └── Map.jsx             # Leaflet Map Engine, Drawing Tools, & EE Tile Layers
│   │   ├── App.jsx                 # Main Dashboard Application State & Components
│   │   ├── main.jsx                # React DOM Mount Entrypoint
│   │   └── index.css               # Design System Tokens, CSS Variables & Glassmorphism
│   ├── index.html                  # Main HTML Shell & CDN Preloads
│   └── package.json                # Frontend NPM Dependency Manifest
└── documentation/
    └── TECHNICAL_SPECIFICATION_REPORT.md # Deep Technical Architecture Documentation
```

---

## 7. Operational Verification Summary
* **Web Client Server**: Active on `http://localhost:5173`
* **FastAPI Server**: Active on `http://127.0.0.1:8000`
* **GEE Project**: Active & Authenticated (`crop-health-ai-505815`)
* **Test Verification**: 100% API endpoints, ML predictions, Land Safety Guardrails, and PDF downloads verified cleanly.
