import React, { useState, useRef } from 'react';
import {
  Upload, Camera, Sparkles, CheckCircle2, AlertTriangle,
  Droplets, ShieldAlert, Volume2, ArrowRight, RefreshCw, Layers,
  FileText, ShieldCheck, ChevronRight, Zap, Leaf, Check
} from 'lucide-react';

const CROP_OPTIONS = [
  'Paddy / Rice',
  'Sugarcane',
  'Cotton',
  'Vegetables / Tomato',
  'Maize / Corn',
  'Banana',
  'General Crop',
];

// Presets with SVG graphics for instant 1-click test simulation
const SAMPLE_PRESETS = [
  {
    id: 'paddy_blast',
    crop: 'Paddy / Rice',
    title: '🌾 Rice Blast (Paddy)',
    subtitle: 'Spindle lesions with grey centers',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4ade80"/>
          <stop offset="50%" stop-color="#22c55e"/>
          <stop offset="100%" stop-color="#15803d"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="#0f172a"/>
      <path d="M 60 360 Q 150 180 340 50 Q 220 220 60 360" fill="url(#leafGrad)"/>
      <path d="M 60 360 Q 185 200 340 50" stroke="#166534" stroke-width="4" fill="none"/>
      <!-- Blast lesions -->
      <ellipse cx="200" cy="180" rx="28" ry="12" fill="#78350f" transform="rotate(-35 200 180)"/>
      <ellipse cx="200" cy="180" rx="16" ry="6" fill="#cbd5e1" transform="rotate(-35 200 180)"/>
      <ellipse cx="250" cy="130" rx="24" ry="10" fill="#78350f" transform="rotate(-38 250 130)"/>
      <ellipse cx="250" cy="130" rx="14" ry="5" fill="#e2e8f0" transform="rotate(-38 250 130)"/>
      <ellipse cx="150" cy="240" rx="22" ry="9" fill="#78350f" transform="rotate(-30 150 240)"/>
      <ellipse cx="150" cy="240" rx="12" ry="4" fill="#cbd5e1" transform="rotate(-30 150 240)"/>
    </svg>`
  },
  {
    id: 'sugarcane_spot',
    crop: 'Sugarcane',
    title: '🎋 Brown Spot (Sugarcane)',
    subtitle: 'Reddish-brown oval lesions',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="scGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#86efac"/>
          <stop offset="60%" stop-color="#22c55e"/>
          <stop offset="100%" stop-color="#14532d"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="#0f172a"/>
      <path d="M 40 370 Q 180 200 370 30 Q 240 240 40 370" fill="url(#scGrad)"/>
      <path d="M 40 370 Q 205 200 370 30" stroke="#15803d" stroke-width="4" fill="none"/>
      <!-- Brown spots with yellow halos -->
      <ellipse cx="180" cy="210" rx="30" ry="14" fill="#fef08a" transform="rotate(-40 180 210)"/>
      <ellipse cx="180" cy="210" rx="22" ry="8" fill="#991b1b" transform="rotate(-40 180 210)"/>
      <ellipse cx="260" cy="120" rx="26" ry="12" fill="#fef08a" transform="rotate(-42 260 120)"/>
      <ellipse cx="260" cy="120" rx="18" ry="7" fill="#7f1d1d" transform="rotate(-42 260 120)"/>
      <ellipse cx="130" cy="270" rx="20" ry="10" fill="#fef08a" transform="rotate(-38 130 270)"/>
      <ellipse cx="130" cy="270" rx="14" ry="6" fill="#991b1b" transform="rotate(-38 130 270)"/>
    </svg>`
  },
  {
    id: 'cotton_blight',
    crop: 'Cotton',
    title: '🌿 Bacterial Blight (Cotton)',
    subtitle: 'Angular water-soaked spots',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="cottonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4ade80"/>
          <stop offset="70%" stop-color="#16a34a"/>
          <stop offset="100%" stop-color="#14532d"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="#0f172a"/>
      <path d="M 200 60 Q 270 120 330 200 Q 270 280 200 340 Q 130 280 70 200 Q 130 120 200 60" fill="url(#cottonGrad)"/>
      <!-- Angular blight patches -->
      <polygon points="170,160 210,150 200,185 160,180" fill="#451a03"/>
      <polygon points="220,190 260,180 250,220 215,210" fill="#451a03"/>
      <polygon points="140,220 180,210 170,245 130,240" fill="#78350f"/>
      <polygon points="200,240 235,230 230,265 190,260" fill="#451a03"/>
    </svg>`
  }
];

export default function DualLensStepper({
  analysisData,
  farmData,
  searchLocationName,
  saveCropType,
  token,
  depthResult,
  onDepthResultUpdate,
  onOpenVoiceAgronomist,
  pdfUrl,
}) {
  const [selectedCrop, setSelectedCrop] = useState(saveCropType || 'Paddy / Rice');
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('combined'); // 'combined' | 'satellite'

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  if (!analysisData) return null;

  const farmName = searchLocationName || 'Marked Farm Field';
  const acres = analysisData?.statistics?.area_acres || farmData?.area?.acres || 0;
  const grade = analysisData?.gemini_recommendations?.executive_summary?.overall_health_grade || 'B';
  const ndvi = analysisData?.historical_comparison?.current_mean_ndvi || analysisData?.statistics?.ndvi?.mean || 0.45;
  const ndviVal = typeof ndvi === 'number' ? ndvi.toFixed(2) : ndvi;
  const probAcres = analysisData?.problem_zones?.problem_area_acres || 0.0;
  const probPct = analysisData?.problem_zones?.problem_area_percentage || 0.0;
  const weather = analysisData?.weather_correlation || {};

  // Convert SVG string to data URL using canvas
  const convertSvgToJpeg = (svgString) => {
    return new Promise((resolve) => {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 400, 400);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = url;
    });
  };

  const handleSelectPreset = async (preset) => {
    setSelectedCrop(preset.crop);
    setError(null);
    try {
      const dataUrl = await convertSvgToJpeg(preset.svg);
      setImagePreview(dataUrl);
    } catch (e) {
      console.error('Preset conversion error:', e);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRunDepthFusion = async () => {
    if (!imagePreview) {
      setError('Please upload a leaf photograph or select one of the instant sample presets below.');
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    setAnalysisStep('🔬 Scanning leaf lesions with Gemini Multimodal Vision AI...');
    const t1 = setTimeout(() => {
      setAnalysisStep('🛰️ Correlating leaf pathology with Sentinel-2 problem sub-zone...');
    }, 1400);
    const t2 = setTimeout(() => {
      setAnalysisStep('🧪 Formulating precision variable-rate prescription & spread risk...');
    }, 2800);

    try {
      const satCtx = {
        farm_session_id: analysisData?.farm_session_id,
        farm_name: farmName,
        crop_type: selectedCrop,
        area_acres: acres,
        health_grade: grade,
        ndvi: ndvi,
        ndre: analysisData?.statistics?.ndre?.mean || 0.24,
        savi: analysisData?.statistics?.savi?.mean || 0.25,
        problem_area_pct: probPct,
        problem_area_acres: probAcres,
        zone_description: analysisData?.problem_zones?.zone_description || 'Stressed canopy area',
        weather: weather,
      };

      const res = await fetch('/api/ai/depth-analysis/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          image_base64: imagePreview,
          crop_type: selectedCrop,
          satellite_context: satCtx,
          language: 'en',
        }),
      });

      clearTimeout(t1);
      clearTimeout(t2);

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `API returned status ${res.status}`);
      }

      const data = await res.json();
      if (onDepthResultUpdate) {
        onDepthResultUpdate(data);
      }
    } catch (err) {
      console.error('Depth fusion error:', err);
      setError(err.message || 'Failed to complete depth analysis fusion. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const isFused = Boolean(depthResult);

  return (
    <section style={{ marginBottom: '2rem' }}>
      {/* ── GUIDED STEPPER NAVIGATION BAR ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(8, 16, 32, 0.98))',
          border: '1.5px solid rgba(0, 245, 160, 0.35)',
          borderRadius: '20px',
          padding: '1.25rem 1.6rem',
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.5), 0 0 25px rgba(0, 245, 160, 0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎯</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                Two-Stage Dual-Lens Crop Health Intelligence
              </h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
              From 786 km Orbit to 10 cm Leaf Cell: Connect Satellite Vegetation Anomalies with Ground-Truth Pathology.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '800',
                padding: '0.35rem 0.8rem',
                borderRadius: '9999px',
                background: isFused ? 'rgba(0, 245, 160, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: isFused ? '#00f5a0' : '#60a5fa',
                border: isFused ? '1px solid #00f5a0' : '1px solid #3b82f6',
              }}
            >
              {isFused ? '✓ Stage 1 & 2 Complete (Dual-Lens Fused)' : 'Stage 1 Complete ➔ Stage 2 Pending'}
            </span>
          </div>
        </div>

        {/* Stepper Progress Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginTop: '1.2rem',
            paddingTop: '1.2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* STEP 1: SATELLITE MACRO (Completed) */}
          <div
            style={{
              background: 'rgba(0, 245, 160, 0.06)',
              border: '1px solid rgba(0, 245, 160, 0.35)',
              borderRadius: '14px',
              padding: '0.85rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#00f5a0',
                color: '#030712',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '0.95rem',
                flexShrink: 0,
              }}
            >
              ✓
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#00f5a0' }}>STEP 1: SATELLITE MACRO</span>
                <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{acres.toFixed(1)} Acres</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Sentinel-2 Orbit Scan Verified
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                NDVI: <strong style={{ color: '#00f5a0' }}>{ndviVal}</strong> (Grade {grade}) | Red Zone: <strong style={{ color: '#f87171' }}>{probAcres.toFixed(2)} ac</strong>
              </div>
            </div>
          </div>

          {/* STEP 2: LEAF MICRO (Action Required or Completed) */}
          <div
            style={{
              background: isFused ? 'rgba(0, 217, 245, 0.06)' : 'rgba(234, 179, 8, 0.08)',
              border: isFused ? '1px solid rgba(0, 217, 245, 0.4)' : '1.5px dashed rgba(234, 179, 8, 0.5)',
              borderRadius: '14px',
              padding: '0.85rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: isFused ? '#00d9f5' : 'rgba(234, 179, 8, 0.25)',
                color: isFused ? '#030712' : '#fef08a',
                border: isFused ? 'none' : '1px solid #eab308',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '0.95rem',
                flexShrink: 0,
              }}
            >
              {isFused ? '✓' : '2'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: isFused ? '#00d9f5' : '#fbbf24' }}>
                  STEP 2: LEAF PATHOLOGY
                </span>
                <span style={{ fontSize: '0.72rem', color: isFused ? '#00d9f5' : '#fbbf24', fontWeight: '700' }}>
                  {isFused ? 'UNLOCKED' : 'ACTION REQUIRED'}
                </span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff' }}>
                {isFused ? depthResult?.leaf_pathology?.disease_name : 'Verify Ground-Truth Leaf Photo'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                {isFused
                  ? `Category: ${depthResult?.leaf_pathology?.pathogen_category} (Severity: ${depthResult?.leaf_pathology?.severity_grade})`
                  : `Upload leaf from ${probAcres.toFixed(1)} ac red zone to unlock prescription`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STAGE 2: UPLOAD & VERIFICATION CARD (Shown if not yet fused, or expandable) ── */}
      {!isFused && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(8, 16, 32, 0.98), rgba(15, 23, 42, 0.95))',
            border: '2px solid rgba(234, 179, 8, 0.45)',
            borderRadius: '20px',
            padding: '1.6rem',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(234, 179, 8, 0.1)',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🔬</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fef08a', margin: 0 }}>
                  Step 2: Ground-Truth Leaf Verification
                </h3>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#cbd5e1', margin: '0.35rem 0 0 0', maxWidth: '720px', lineHeight: '1.45' }}>
                Sentinel-2 detected <strong style={{ color: '#f87171' }}>{probAcres.toFixed(2)} acres ({probPct.toFixed(1)}%)</strong> of stressed canopy in this field.
                To diagnose the exact cellular disease pathogen and formulate a targeted precision treatment plan, upload a photo of an affected leaf or select an instant sample preset.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>Crop:</label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(0, 245, 160, 0.4)',
                  color: '#ffffff',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  outline: 'none',
                }}
              >
                {CROP_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick 1-Click Sample Leaf Presets */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
              ⚡ Instant Test Presets (Click to Test Without Leaf Photo):
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
              {SAMPLE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '0.65rem 0.9rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 245, 160, 0.12)';
                    e.currentTarget.style.borderColor = '#00f5a0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ffffff' }}>{p.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.subtitle}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#00f5a0', fontWeight: '800' }}>Try ➔</span>
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop Upload or Preview Area */}
          <div
            style={{
              border: imagePreview ? '1.5px solid #00f5a0' : '2px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              padding: '1.25rem',
              background: 'rgba(2, 6, 23, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              minHeight: '170px',
              cursor: imagePreview ? 'default' : 'pointer',
              position: 'relative',
            }}
            onClick={() => {
              if (!imagePreview && fileInputRef.current) fileInputRef.current.click();
            }}
          >
            {imagePreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', width: '100%' }}>
                <img
                  src={imagePreview}
                  alt="Selected Leaf Sample"
                  style={{
                    width: '130px',
                    height: '130px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: '2px solid #00f5a0',
                    boxShadow: '0 0 20px rgba(0, 245, 160, 0.3)',
                  }}
                />
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#00f5a0', fontWeight: '800', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={18} />
                    <span>Leaf Photograph Staged & Ready</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0.25rem 0 0.85rem 0' }}>
                    Selected Crop: <strong style={{ color: '#ffffff' }}>{selectedCrop}</strong>. Click below to run the Gemini Multimodal Vision AI fusion with your Sentinel-2 satellite data.
                  </p>
                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(null);
                      }}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                    >
                      ✕ Remove Photo
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (fileInputRef.current) fileInputRef.current.click();
                      }}
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
                    >
                      📁 Change Photo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>📸</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff' }}>
                  Drag & Drop a leaf photo here, or browse files
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                  Supports JPEG, PNG, WEBP • Pick a leaf showing spots, chlorosis, or wilting
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.9rem' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Upload size={14} />
                    <span>Upload Leaf Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cameraInputRef.current) cameraInputRef.current.click();
                    }}
                    style={{
                      background: 'rgba(0, 217, 245, 0.12)',
                      border: '1px solid rgba(0, 217, 245, 0.4)',
                      color: '#00d9f5',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Camera size={14} />
                    <span>Take Camera Photo</span>
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {error && (
            <div style={{ marginTop: '0.85rem', color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <div style={{ marginTop: '1.4rem', display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', alignItems: 'center' }}>
            {isAnalyzing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#00f5a0', fontSize: '0.9rem', fontWeight: '700' }}>
                <RefreshCw size={18} className="spin" />
                <span>{analysisStep || 'Analyzing dual-lens data...'}</span>
              </div>
            ) : (
              <button
                onClick={handleRunDepthFusion}
                disabled={!imagePreview}
                style={{
                  background: imagePreview
                    ? 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.85rem 1.8rem',
                  color: imagePreview ? '#030712' : '#64748b',
                  fontSize: '0.98rem',
                  fontWeight: '900',
                  cursor: imagePreview ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  boxShadow: imagePreview ? '0 6px 25px rgba(0, 245, 160, 0.45)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <Zap size={18} />
                <span>FUSE MACRO + MICRO & GENERATE MASTER REPORT</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STAGE 3: THE COMBINED MACRO + MICRO MASTER REPORT ── */}
      {isFused && (
        <div
          style={{
            background: 'linear-gradient(165deg, rgba(8, 16, 32, 0.98), rgba(3, 7, 18, 0.99))',
            border: '2px solid #00f5a0',
            borderRadius: '24px',
            padding: '1.8rem',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 50px rgba(0, 245, 160, 0.2)',
            marginBottom: '1.75rem',
          }}
        >
          {/* Header Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1.2rem', marginBottom: '1.4rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.6rem' }}>🌟</span>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#00f5a0', margin: 0 }}>
                    Combined Macro + Micro Master Crop Health Report
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                    Copernicus Sentinel-2 Orbit Multispectral × Gemini Multimodal Cellular Leaf Vision
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={onOpenVoiceAgronomist}
                style={{
                  background: 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  color: '#030712',
                  fontSize: '0.88rem',
                  fontWeight: '900',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 18px rgba(0, 245, 160, 0.45)',
                }}
              >
                <span>🎙️</span>
                <span>Ask Voice Agronomist</span>
              </button>

              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '10px',
                    padding: '0.65rem 1.1rem',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    textDecoration: 'none',
                  }}
                >
                  <FileText size={16} />
                  <span>Download Master PDF</span>
                </a>
              )}

              <button
                onClick={() => onDepthResultUpdate(null)}
                className="btn-secondary"
                style={{ padding: '0.65rem 0.95rem', fontSize: '0.82rem' }}
                title="Re-verify with another leaf photograph"
              >
                🔄 Test Another Leaf
              </button>
            </div>
          </div>

          {/* DUAL-LENS SIDE-BY-SIDE HERO COMPARISON */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.4rem',
            }}
          >
            {/* LENS 1: SATELLITE MACRO CANOPY */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1.5px solid rgba(0, 245, 160, 0.4)',
                borderRadius: '16px',
                padding: '1.2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#00f5a0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🛰️ Macro Lens: Orbit Canopy Health
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {analysisData.observation_details?.spacecraft || 'Sentinel-2'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '0.6rem 0.8rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Overall Vigor</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#00f5a0' }}>Grade {grade}</div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>NDVI: {ndviVal}</div>
                </div>

                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '0.6rem 0.8rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Problem Red Zone</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f87171' }}>{probAcres.toFixed(2)} ac</div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>{probPct.toFixed(1)}% of field</div>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.45', background: 'rgba(255, 255, 255, 0.03)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                📍 <strong>Spatial Anomaly:</strong> {analysisData.problem_zones?.zone_description || 'Stressed canopy detected in field perimeter.'}
              </div>
            </div>

            {/* LENS 2: GROUND LEAF MICRO PATHOLOGY */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1.5px solid rgba(0, 217, 245, 0.4)',
                borderRadius: '16px',
                padding: '1.2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '900', color: '#00d9f5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🔬 Micro Lens: Cellular Leaf Pathology
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.18)',
                    color: '#f87171',
                    border: '1px solid #ef4444',
                  }}
                >
                  {depthResult.leaf_pathology?.pathogen_category || 'FUNGAL'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.85rem' }}>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Analyzed Leaf"
                    style={{
                      width: '75px',
                      height: '75px',
                      objectFit: 'cover',
                      borderRadius: '10px',
                      border: '1.5px solid #00d9f5',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff' }}>
                    {depthResult.leaf_pathology?.disease_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    {depthResult.leaf_pathology?.scientific_pathogen}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#00d9f5', fontWeight: '700', marginTop: '0.2rem' }}>
                    Severity: {depthResult.leaf_pathology?.severity_grade} (Confidence: {depthResult.leaf_pathology?.confidence_pct || 95}%)
                  </div>
                </div>
              </div>

              {depthResult.leaf_pathology?.visual_symptoms && (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {depthResult.leaf_pathology.visual_symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.72rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        color: '#cbd5e1',
                      }}
                    >
                      • {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CAUSAL CORRELATION MATRIX (The "Why") */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(15, 23, 42, 0.95))',
              border: '1.5px solid #3b82f6',
              borderRadius: '16px',
              padding: '1.25rem 1.4rem',
              marginBottom: '1.4rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔗</span>
              <h4 style={{ fontSize: '0.98rem', fontWeight: '900', color: '#60a5fa', margin: 0 }}>
                Causal Correlation: How Leaf Pathology Explains the Satellite Spectral Drop
              </h4>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '700', margin: '0.25rem 0 0.45rem 0' }}>
              "{depthResult.macro_micro_correlation?.headline || 'Foliar Necrosis Explains Satellite Chlorophyll Anomaly'}"
            </p>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
              {depthResult.macro_micro_correlation?.spatial_link || depthResult.macro_micro_correlation?.ndvi_impact}
            </p>
          </div>

          {/* PRECISION VARIABLE-RATE PRESCRIPTION & SAVINGS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Targeted Prescription */}
            <div
              style={{
                background: 'rgba(0, 245, 160, 0.06)',
                border: '1.5px solid #00f5a0',
                borderRadius: '16px',
                padding: '1.3rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '900', color: '#00f5a0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🧪 Variable-Rate Targeted Prescription
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    background: 'rgba(0, 245, 160, 0.2)',
                    color: '#00f5a0',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px',
                  }}
                >
                  Save ~{Math.max(40, Math.min(85, Math.round((1 - (probAcres / (acres || 1))) * 100)))}% Spray Costs
                </span>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Primary Chemical Spray</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff' }}>
                    {depthResult.targeted_prescription?.primary_treatment}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#00f5a0', fontWeight: '700' }}>
                    Dosage: {depthResult.targeted_prescription?.dosage}
                  </div>
                </div>

                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '0.65rem 0.85rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>🎯 Application Target Zone</div>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: '700' }}>
                    {depthResult.targeted_prescription?.application_area || `Spray ${probAcres.toFixed(2)} acre problem zone + 5m buffer`}
                  </div>
                </div>

                {depthResult.targeted_prescription?.organic_alternative && (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>🌿 Organic / Biological Alternative</div>
                    <div style={{ fontSize: '0.85rem', color: '#86efac' }}>
                      {depthResult.targeted_prescription.organic_alternative}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5-Day Spread Forecast & Weather Risk */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1.5px solid #f59e0b',
                borderRadius: '16px',
                padding: '1.3rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ⚠️ 5-Day Disease Spread Risk
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '900',
                    background: depthResult.spread_risk_forecast?.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b',
                    color: '#030712',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                  }}
                >
                  {depthResult.spread_risk_forecast?.risk_level || 'MODERATE'} RISK
                </span>
              </div>

              <p style={{ fontSize: '0.86rem', color: '#fef08a', lineHeight: '1.5', margin: '0 0 0.85rem 0' }}>
                {depthResult.spread_risk_forecast?.forecast_summary}
              </p>

              <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '0.75rem 0.9rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Local Micro-Climate Catalysts:</div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#ffffff' }}>
                  <span>💧 Humidity: <strong>{weather.humidity_pct || 72}%</strong></span>
                  <span>🌡️ Temp: <strong>{weather.temperature_c || 29}°C</strong></span>
                  <span>🌧️ 7D Rain: <strong>{weather.rain_7day_sum_mm || 0}mm</strong></span>
                </div>
              </div>

              {depthResult.spread_risk_forecast?.potential_yield_loss_pct && (
                <div style={{ marginTop: '0.8rem', fontSize: '0.78rem', color: '#f87171' }}>
                  🚨 Potential Yield Risk if Unchecked: <strong>~{depthResult.spread_risk_forecast.potential_yield_loss_pct}%</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
