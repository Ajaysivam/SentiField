# SentiField: AI-Powered Precision Agriculture & Crop Health Intelligence

**SentiField** is an end-to-end autonomous precision agriculture platform combining real-time Sentinel-2 satellite Earth Observation imagery, localized soil/weather indices, Gemini Multimodal Vision AI for leaf pathology, interactive Web Speech Voice-to-Voice Agronomist, and a priority-ranked farmer multi-farm action dashboard.

---

## 🌟 Key Features

1. **Satellite Earth Observation (Google Earth Engine & Sentinel-2)**:
   - Automated polygon clipping to farmer-defined field boundaries.
   - Multispectral vegetation index computation: **NDVI**, **NDRE**, **EVI**, **SAVI**.
   - Cloud masking and sub-pixel spectral analysis.
   - Temporal crop health tracking and change detection.

2. **Unified Macro + Micro "Depth Analysis"**:
   - Integrates macro-level Sentinel-2 satellite indices (macro canopy health) with micro-level high-resolution leaf camera images.
   - Multimodal Gemini Vision AI pinpoints exact leaf disease pathologies, infection stages, pathogen categories, and generates customized dual-layer treatment plans.

3. **Multilingual Voice-to-Voice AI Agronomist**:
   - Conversational AI agronomist accessible on both the Farmer Dashboard and Interactive Guest Map mode.
   - Full Web Speech API integration (Speech-to-Text & Text-to-Speech) supporting English, Tamil, and Hindi.
   - Dynamic animated audio waveform equalizer and real-time chat transcript.

4. **Multi-Farm Priority Action Dashboard**:
   - Aggregates all registered farmer fields into a unified management matrix.
   - Automatically ranks plots from highest emergency to optimal condition based on NDVI stress, NDRE nitrogen deficit, and moisture decay.
   - Step-by-step prioritized agronomical recommendations (e.g., immediate irrigation, fungicide spraying, fertilizer top-dressing).

5. **Automated Agronomic PDF Reporting**:
   - One-click comprehensive agronomic PDF report generation with embedded NDVI maps, field statistics, historical charts, and agronomist recommendations.

---

## 📁 Repository Structure

```text
SentiField/
├── frontend/           # React 18 + Vite UI (Leaflet GIS, Lucide icons, Web Speech STT/TTS, Tailwind)
├── backend/            # FastAPI Python server (GEE, Sentinel-2 pipeline, Gemini AI, ReportLab)
├── data/               # Spatial datasets & local cache
├── farm_boundary/      # Exported GeoJSON field boundaries
├── models/             # Machine Learning models (Random Forest crop classification)
├── outputs/            # Processed raster maps & index tiles
├── reports/            # Generated PDF farm health reports
├── notebooks/          # Exploratory Earth Observation & validation notebooks
└── documentation/      # Architecture, specs & research notes
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+
- Google Earth Engine access / Google Cloud Project ID
- Google Gemini API Key

---

### 2. Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   *Required variables:*
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `GEE_PROJECT_ID`: Your Google Earth Engine cloud project id.

5. Start the backend server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

Backend will be available at: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`).

---

### 3. Frontend Setup (React + Vite)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

Frontend will be available at: `http://localhost:5173`.

---

## 🧪 API Verification & Health Check

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "AI Precision Agriculture API",
  "timestamp_status": "Healthy",
  "backend": "FastAPI",
  "version": "1.0.0"
}
```

---

## 📄 License
This project is licensed under the MIT License.
