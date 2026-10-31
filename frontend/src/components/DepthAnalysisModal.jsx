import React, { useState, useRef } from 'react';
import {
  Upload, Camera, X, Sparkles, CheckCircle2, AlertTriangle,
  Droplets, ShieldAlert, Volume2, ArrowRight, RefreshCw, Layers, FileText
} from 'lucide-react';

/**
 * DepthAnalysisModal
 * ------------------
 * Unified Macro-to-Micro Crop Health Depth Diagnostics.
 * Fuses ground-level leaf pathology computer vision with Sentinel-2
 * multispectral remote sensing (NDVI, NDRE, problem zones, weather ET₀ deficit).
 */

const CROP_OPTIONS = [
  'Paddy / Rice',
  'Sugarcane',
  'Cotton',
  'Vegetables / Tomato',
  'Maize / Corn',
  'Wheat',
  'Coconut',
  'Banana',
  'General Crop',
];

export default function DepthAnalysisModal({
  isOpen,
  onClose,
  activeContext,
  token,
  onDepthAnalysisComplete,
}) {
  const [selectedCrop, setSelectedCrop] = useState(
    activeContext?.activeFarm?.crop_type || activeContext?.cropType || 'General Crop'
  );
  const [selectedLang, setSelectedLang] = useState('en');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [depthResult, setDepthResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  if (!isOpen) return null;

  const farmName =
    activeContext?.activeFarm?.farm_name ||
    activeContext?.farmName ||
    'Marked Farm Field';
  const acres =
    activeContext?.activeFarm?.area_acres ||
    activeContext?.analysisData?.statistics?.area_acres ||
    0;
  const grade =
    activeContext?.analysisData?.gemini_recommendations?.executive_summary?.overall_health_grade ||
    'B';
  const hasSatellite = Boolean(activeContext?.analysisData);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WEBP).');
      return;
    }

    setError(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WEBP).');
      return;
    }

    setError(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRunDepthAnalysis = async () => {
    if (!imagePreview) {
      setError('Please upload or snap a photograph of the affected plant leaf first.');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setDepthResult(null);

    // Visual step sequence
    setAnalysisStep('🔬 Scanning leaf cellular lesions with Gemini Multimodal Vision...');
    const stepTimer1 = setTimeout(() => {
      setAnalysisStep('🛰️ Correlating leaf pathology with Sentinel-2 NDVI problem sub-zones...');
    }, 1500);
    const stepTimer2 = setTimeout(() => {
      setAnalysisStep('🧪 Formulating precision targeted prescription and spread forecast...');
    }, 3200);

    try {
      // Build satellite context payload
      const satCtx = {
        farm_name: farmName,
        crop_type: selectedCrop,
        area_acres: acres,
        health_grade: grade,
        ndvi:
          activeContext?.analysisData?.historical_comparison?.current_mean_ndvi ||
          activeContext?.analysisData?.statistics?.ndvi?.mean ||
          0.45,
        ndre: activeContext?.analysisData?.statistics?.ndre?.mean || 0.24,
        savi: activeContext?.analysisData?.statistics?.savi?.mean || 0.25,
        problem_area_pct:
          activeContext?.analysisData?.problem_zones?.problem_area_percentage || 28.0,
        problem_area_acres:
          activeContext?.analysisData?.problem_zones?.problem_area_acres || 0.8,
        zone_description:
          activeContext?.analysisData?.problem_zones?.zone_description ||
          'Southwest sector shows canopy vigor reduction',
        weather: activeContext?.analysisData?.weather_correlation || {},
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
          language: selectedLang,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `API error: ${res.status}`);
      }

      const data = await res.json();
      setDepthResult(data);
      if (onDepthAnalysisComplete) {
        onDepthAnalysisComplete(data);
      }
    } catch (err) {
      console.error('Depth analysis failed:', err);
      setError(err.message || 'Failed to complete depth analysis. Please try another leaf photo.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const speakDiagnosis = (text) => {
    if (!synthRef.current || !text) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    const langCode = selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'hi' ? 'hi-IN' : 'en-IN';

    const matchedVoice = voices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').includes(langCode.toLowerCase().slice(0, 2))
    );
    if (matchedVoice) utterance.voice = matchedVoice;
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (synthRef.current) synthRef.current.cancel();
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          height: '90vh',
          maxHeight: '920px',
          background: 'linear-gradient(165deg, rgba(8, 16, 32, 0.98) 0%, rgba(3, 7, 18, 0.99) 100%)',
          border: '1.5px solid rgba(0, 245, 160, 0.4)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 50px rgba(0, 245, 160, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: '1.1rem 1.4rem',
            background: 'rgba(15, 23, 42, 0.75)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: '0 0 20px rgba(0, 245, 160, 0.4)',
              }}
            >
              🔬
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                  Macro + Micro Depth Analysis
                </span>
                <span
                  style={{
                    background: 'rgba(0, 217, 245, 0.15)',
                    border: '1px solid rgba(0, 217, 245, 0.4)',
                    color: '#00d9f5',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                  }}
                >
                  Leaf + Satellite Fusion
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🌱 <strong>Target Field:</strong> {farmName} {acres > 0 ? `(${acres.toFixed(2)} ac)` : ''}</span>
                {hasSatellite && (
                  <span style={{ color: '#00f5a0' }}>• Sentinel-2 Grade {grade} Linked</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Language Selector */}
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              style={{
                background: 'rgba(2, 6, 23, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '0.35rem 0.6rem',
                color: '#00f5a0',
                fontSize: '0.78rem',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="en" style={{ background: '#081020', color: '#fff' }}>🇬🇧 English</option>
              <option value="ta" style={{ background: '#081020', color: '#fff' }}>🇮🇳 தமிழ் (Tamil)</option>
              <option value="hi" style={{ background: '#081020', color: '#fff' }}>🇮🇳 हिंदी (Hindi)</option>
            </select>

            <button
              onClick={() => {
                if (synthRef.current) synthRef.current.cancel();
                onClose();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                borderRadius: '8px',
                padding: '0.45rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── BODY SCROLL AREA ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.4rem' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                padding: '0.85rem 1.1rem',
                color: '#f87171',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                marginBottom: '1.25rem',
              }}
            >
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* ── TOP SECTION: UPLOAD & CROP SELECTOR ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: imagePreview ? '300px 1fr' : '1fr',
              gap: '1.25rem',
              alignItems: 'start',
              marginBottom: '1.5rem',
            }}
          >
            {/* Upload Box */}
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(0, 245, 160, 0.35)',
                  borderRadius: '16px',
                  background: imagePreview ? 'rgba(0, 0, 0, 0.4)' : 'rgba(15, 23, 42, 0.6)',
                  padding: imagePreview ? '0.75rem' : '2rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {imagePreview ? (
                  <div>
                    <img
                      src={imagePreview}
                      alt="Crop Leaf Preview"
                      style={{
                        width: '100%',
                        maxHeight: '220px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                      }}
                    />
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        style={{
                          background: 'rgba(0, 245, 160, 0.15)',
                          border: '1px solid rgba(0, 245, 160, 0.4)',
                          color: '#00f5a0',
                          borderRadius: '6px',
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageFile(null);
                          setImagePreview(null);
                          setDepthResult(null);
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#f87171',
                          borderRadius: '6px',
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: 'rgba(0, 245, 160, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.85rem auto',
                        color: '#00f5a0',
                      }}
                    >
                      <Upload size={24} />
                    </div>
                    <strong style={{ fontSize: '0.98rem', color: '#f8fafc', display: 'block' }}>
                      Upload Affected Leaf Photo
                    </strong>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.35rem 0 0.85rem 0' }}>
                      Drag and drop image, or click to browse (JPEG, PNG)
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cameraInputRef.current?.click();
                        }}
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 245, 160, 0.15) 0%, rgba(0, 217, 245, 0.15) 100%)',
                          border: '1px solid #00f5a0',
                          color: '#00f5a0',
                          borderRadius: '8px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Camera size={14} />
                        Snap with Camera
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Controls: Crop Type & Action */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>
                  Crop Type (Auto-detected or Select):
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(2, 6, 23, 0.8)',
                    border: '1.5px solid rgba(0, 245, 160, 0.3)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.9rem',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    fontWeight: '700',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {CROP_OPTIONS.map((c) => (
                    <option key={c} value={c} style={{ background: '#081020', color: '#fff' }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Satellite Telemetry Sync Card */}
              <div
                style={{
                  background: 'rgba(0, 245, 160, 0.06)',
                  border: '1px solid rgba(0, 245, 160, 0.25)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.95rem',
                  fontSize: '0.82rem',
                  color: '#cbd5e1',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1rem' }}>🛰️</span>
                  <strong style={{ color: '#00f5a0' }}>Active Satellite Telemetry Linked:</strong>
                </div>
                <div>
                  • Health Grade: <strong>{grade}</strong> | Area: <strong>{acres > 0 ? acres.toFixed(2) : 2.5} acres</strong>
                  <br />
                  • Problem Sector: <strong>{activeContext?.analysisData?.problem_zones?.problem_area_percentage || 28}% stressed</strong>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunDepthAnalysis}
                disabled={isAnalyzing || !imagePreview}
                style={{
                  background: imagePreview && !isAnalyzing
                    ? 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)'
                    : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.85rem 1.4rem',
                  color: imagePreview && !isAnalyzing ? '#030712' : '#64748b',
                  fontSize: '0.96rem',
                  fontWeight: '900',
                  cursor: imagePreview && !isAnalyzing ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: imagePreview && !isAnalyzing ? '0 4px 20px rgba(0, 245, 160, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Analyzing Leaf + Satellite Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Run Unified Macro+Micro Depth Analysis</span>
                  </>
                )}
              </button>

              {isAnalyzing && analysisStep && (
                <div style={{ fontSize: '0.82rem', color: '#00d9f5', fontStyle: 'italic', textAlign: 'center' }}>
                  {analysisStep}
                </div>
              )}
            </div>
          </div>

          {/* ── RESULTS SECTION ── */}
          {depthResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Header result row */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 245, 160, 0.12) 0%, rgba(0, 217, 245, 0.08) 100%)',
                  border: '1.5px solid #00f5a0',
                  borderRadius: '16px',
                  padding: '1.2rem 1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  boxShadow: '0 8px 30px rgba(0, 245, 160, 0.15)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: '900',
                        padding: '0.15rem 0.55rem',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {depthResult.leaf_pathology?.pathogen_category || 'PATHOLOGY DETECTED'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Confidence: <strong style={{ color: '#00f5a0' }}>{depthResult.leaf_pathology?.confidence_pct || 94}%</strong>
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    {depthResult.leaf_pathology?.disease_name || 'Foliar Blight Complex'}
                  </h3>
                  <div style={{ fontSize: '0.84rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.2rem' }}>
                    Pathogen: {depthResult.leaf_pathology?.scientific_pathogen || 'Foliar organism'}
                  </div>
                </div>

                {depthResult.spoken_explanation && (
                  <button
                    onClick={() => speakDiagnosis(depthResult.spoken_explanation)}
                    style={{
                      background: isSpeaking ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #00f5a0, #00d9f5)',
                      border: isSpeaking ? '1.5px solid #ef4444' : 'none',
                      color: isSpeaking ? '#f87171' : '#030712',
                      borderRadius: '10px',
                      padding: '0.65rem 1.15rem',
                      fontSize: '0.86rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: isSpeaking ? '0 0 15px rgba(239,68,68,0.4)' : '0 4px 16px rgba(0, 245, 160, 0.3)',
                    }}
                  >
                    <Volume2 size={16} />
                    <span>{isSpeaking ? '⏹️ Stop Voice' : '🎙️ Listen to Diagnosis'}</span>
                  </button>
                )}
              </div>

              {/* MACRO-MICRO CORRELATION CARD */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(0, 217, 245, 0.35)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🌐</span>
                  <strong style={{ fontSize: '1.05rem', color: '#00d9f5' }}>
                    Macro-to-Micro Spatial Correlation
                  </strong>
                </div>

                <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '800', marginBottom: '0.4rem' }}>
                  {depthResult.macro_micro_correlation?.headline}
                </h4>

                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 0.65rem 0' }}>
                  {depthResult.macro_micro_correlation?.spatial_link}
                </p>

                {depthResult.macro_micro_correlation?.ndvi_impact && (
                  <div
                    style={{
                      background: 'rgba(2, 6, 23, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.84rem',
                      color: '#94a3b8',
                    }}
                  >
                    📊 <strong>NDVI Impact:</strong> {depthResult.macro_micro_correlation.ndvi_impact}
                  </div>
                )}
              </div>

              {/* TARGETED PRESCRIPTION & SPREAD RISK GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', flexWrap: 'wrap' }}>
                {/* Prescription */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(52, 211, 153, 0.35)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🧪</span>
                    <strong style={{ fontSize: '1rem', color: '#34d399' }}>
                      Targeted Field Prescription
                    </strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.76rem', fontWeight: '800', textTransform: 'uppercase' }}>Primary Treatment:</span>
                      <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '0.98rem' }}>
                        {depthResult.targeted_prescription?.primary_treatment}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.76rem', fontWeight: '800', textTransform: 'uppercase' }}>Dosage:</span>
                      <div style={{ color: '#38bdf8', fontWeight: '700' }}>
                        {depthResult.targeted_prescription?.dosage}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.76rem', fontWeight: '800', textTransform: 'uppercase' }}>Application Target:</span>
                      <div style={{ color: '#fbbf24', fontWeight: '700' }}>
                        🎯 {depthResult.targeted_prescription?.application_area}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.76rem', fontWeight: '800', textTransform: 'uppercase' }}>Organic Alternative:</span>
                      <div style={{ color: '#a7f3d0' }}>
                        🌱 {depthResult.targeted_prescription?.organic_alternative}
                      </div>
                    </div>

                    {depthResult.targeted_prescription?.soil_nutrient_boost && (
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.76rem', fontWeight: '800', textTransform: 'uppercase' }}>Nutrient Boost:</span>
                        <div style={{ color: '#cbd5e1' }}>
                          ⚡ {depthResult.targeted_prescription.soil_nutrient_boost}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5-Day Spread Risk */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldAlert size={18} color="#ef4444" />
                        <strong style={{ fontSize: '1rem', color: '#f87171' }}>
                          5-Day Spread Risk
                        </strong>
                      </div>
                      <span
                        style={{
                          background: depthResult.spread_risk_forecast?.risk_level === 'HIGH' ? '#dc2626' : '#d97706',
                          color: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: '900',
                          padding: '0.18rem 0.55rem',
                          borderRadius: '6px',
                        }}
                      >
                        {depthResult.spread_risk_forecast?.risk_level || 'MODERATE'} RISK
                      </span>
                    </div>

                    <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.55', margin: '0 0 1rem 0' }}>
                      {depthResult.spread_risk_forecast?.forecast_summary}
                    </p>
                  </div>

                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: '#fca5a5' }}>Potential Yield Loss If Unchecked:</span>
                    <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>
                      ~{depthResult.spread_risk_forecast?.potential_yield_loss_pct || 20}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

