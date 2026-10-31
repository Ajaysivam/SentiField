import React, { useState, useEffect, useCallback } from 'react';
import PriorityTimeline from './PriorityTimeline';
import VoiceAgronomistModal from './VoiceAgronomistModal';
import DepthAnalysisModal from './DepthAnalysisModal';

/**
 * FarmerDashboard
 * ---------------
 * A dedicated, persistent dashboard shown after farmer login.
 * Features:
 *  - Lists all saved farm plots with quick-select
 *  - Loads cached satellite analysis from the DB (no re-analysis needed on login)
 *  - Shows persistent Priority Timeline with server-synced step completion
 *  - "Run Deep Analysis" button to re-fetch fresh satellite data
 *  - "Change Location" flow – redraw or search new boundary, then save to same farm
 *  - Health grade, NDVI, weather, trend, problem zones at a glance
 */

const CROP_ICONS = {
  'Paddy / Rice': '🌾',
  'Cotton': '🌱',
  'Sugarcane': '🎋',
  'Maize / Corn': '🌽',
  'Wheat': '🌾',
  'Vegetables / Tomato': '🍅',
  'Coconut': '🥥',
  'Banana': '🍌',
  'General Crop': '🌿',
};

function HealthGradeBadge({ grade }) {
  const colors = {
    'A+': '#10b981', A: '#10b981', 'A-': '#34d399',
    'B+': '#3b82f6', B: '#3b82f6', 'B-': '#60a5fa',
    'C+': '#f59e0b', C: '#f59e0b', 'C-': '#fbbf24',
    D: '#ef4444', F: '#dc2626',
  };
  const col = colors[grade] || '#94a3b8';
  return (
    <div style={{
      width: '64px', height: '64px', borderRadius: '50%',
      background: `rgba(${col === '#10b981' ? '16,185,129' : col === '#3b82f6' ? '59,130,246' : col === '#f59e0b' ? '245,158,11' : '239,68,68'},0.18)`,
      border: `2.5px solid ${col}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.6rem', fontWeight: '900', color: col,
      boxShadow: `0 0 18px ${col}55`,
      flexShrink: 0,
    }}>
      {grade || '—'}
    </div>
  );
}

function StatChip({ label, value, color = '#94a3b8', unit = '' }) {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px', padding: '0.65rem 0.9rem', flex: '1 1 130px',
    }}>
      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: '800', color, marginTop: '0.15rem' }}>
        {value ?? '—'}<span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '2px' }}>{unit}</span>
      </div>
    </div>
  );
}

export default function FarmerDashboard({
  user,
  token,
  savedFarms,
  farmsLoading,
  onAddNewFarm,         // callback → switch to map view to draw new farm
  onChangeFarmLocation, // callback(farm) → switch to map view, pre-fill farm data to redraw
  onViewMap,            // callback(farm) → switch to map view to inspect satellite layers
  onRefreshFarms,       // callback → re-fetch saved farms list
  onLogout,
}) {
  const [activeFarmId, setActiveFarmId] = useState(null);
  const [activeFarm, setActiveFarm] = useState(null);
  const [viewMode, setViewMode] = useState('combined'); // 'combined' | 'single'

  // Portfolio Combined Analysis State
  const [portfolioData, setPortfolioData] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'immediate' | 'short_term' | 'maintenance'

  // Single-Farm Analysis state
  const [cachedAnalysis, setCachedAnalysis] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analyzedAt, setAnalyzedAt] = useState(null);

  // UI state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'timeline' | 'details'
  const [savingSteps, setSavingSteps] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isDepthModalOpen, setIsDepthModalOpen] = useState(false);

  // Fetch portfolio summary on mount & token change
  const fetchPortfolioSummary = useCallback(async () => {
    if (!token) return;
    setPortfolioLoading(true);
    try {
      const res = await fetch('/api/farms/portfolio/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPortfolioData(data);
      }
    } catch (err) {
      console.error('Failed to load portfolio summary:', err);
    } finally {
      setPortfolioLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPortfolioSummary();
  }, [fetchPortfolioSummary]);

  // ── Select a specific farm for deep single-farm view ────────────────────────
  const selectFarm = useCallback(async (farm) => {
    setActiveFarmId(farm.id);
    setActiveFarm(farm);
    setViewMode('single');
    setCachedAnalysis(null);
    setCompletedSteps({});
    setAnalyzedAt(null);
    setAnalysisError(null);
    setActiveTab('overview');
    await loadCachedAnalysis(farm.id);
  }, [token]);

  const loadCachedAnalysis = async (farmId) => {
    try {
      const res = await fetch(`/api/farms/${farmId}/analysis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' && data.analysis_data) {
          setCachedAnalysis(data.analysis_data);
          setCompletedSteps(data.completed_steps || {});
          setAnalyzedAt(data.analyzed_at);
        }
      }
    } catch (err) {
      console.error('Failed to load cached analysis:', err);
    }
  };

  // ── Run Deep Satellite Analysis ─────────────────────────────────────────────
  const runDeepAnalysis = async () => {
    if (!activeFarm) return;
    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      // 1. Validate farm polygon
      const vRes = await fetch('/api/farm/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geojson: activeFarm.geojson }),
      });
      const vData = await vRes.json();
      if (!vRes.ok) throw new Error(vData.detail || 'Validation failed');

      // 2. Prepare GEE
      await fetch('/api/gee/prepare-farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farm_session_id: vData.farm_session_id, geojson: activeFarm.geojson }),
      });

      // 3. Full satellite analysis
      const aRes = await fetch('/api/satellite/analyze-latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farm_session_id: vData.farm_session_id, geojson: activeFarm.geojson }),
      });
      const aData = await aRes.json();
      if (!aRes.ok) throw new Error(aData.detail || 'Analysis failed');

      setCachedAnalysis(aData);
      setCompletedSteps({});
      setAnalyzedAt(new Date().toISOString());

      // 4. Persist analysis to DB
      await fetch(`/api/farms/${activeFarm.id}/analysis/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ analysis_data: aData }),
      });

      fetchPortfolioSummary();
      setActiveTab('overview');
    } catch (err) {
      setAnalysisError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ── Persist completed steps to DB ───────────────────────────────────────────
  const handleStepsChange = useCallback(async (newSteps) => {
    setCompletedSteps(newSteps);
    if (!activeFarm) return;
    setSavingSteps(true);
    try {
      await fetch(`/api/farms/${activeFarm.id}/steps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed_steps: newSteps }),
      });
    } catch (err) {
      console.error('Failed to save steps:', err);
    } finally {
      setSavingSteps(false);
    }
  }, [activeFarm, token]);

  // ── Toggle task completion in Master Action Plan ────────────────────────────
  const handleToggleCombinedStep = async (item) => {
    const updatedStatus = !item.is_completed;
    // Optimistic local state update
    setPortfolioData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ranked_action_items: prev.ranked_action_items.map((ai) =>
          ai.step_key === item.step_key ? { ...ai, is_completed: updatedStatus } : ai
        ),
      };
    });

    try {
      await fetch(`/api/farms/${item.farm_id}/steps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          completed_steps: { [item.step_key]: updatedStatus },
        }),
      });
    } catch (err) {
      console.error('Failed to save step status:', err);
    }
  };

  const filteredActionItems = (portfolioData?.ranked_action_items || []).filter((item) => {
    if (actionFilter === 'all') return true;
    if (actionFilter === 'immediate') return item.timeframe_order === 1;
    if (actionFilter === 'short_term') return item.timeframe_order === 2;
    if (actionFilter === 'maintenance') return item.timeframe_order === 3;
    return true;
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const recs = cachedAnalysis?.gemini_recommendations;
  const exec = recs?.executive_summary;
  const healthGrade = typeof exec === 'object' ? exec?.overall_health_grade : recs?.field_health_status;
  const ndviCurrent = cachedAnalysis?.historical_comparison?.current_mean_ndvi;
  const weather = cachedAnalysis?.weather_correlation;
  const trend = cachedAnalysis?.trend_prediction;
  const damage = cachedAnalysis?.crop_damage_health;
  const problemZones = cachedAnalysis?.problem_zones;

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return iso; }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #040d1a 0%, #071225 50%, #030d1a 100%)',
      color: '#e2e8f0',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      paddingBottom: '4rem',
    }}>
      {/* ── TOP HEADER BAR ── */}
      <div style={{
        background: 'rgba(8,16,32,0.95)',
        borderBottom: '1px solid rgba(0,245,160,0.15)',
        padding: '0.85rem 1.75rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.75rem',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🌱</span>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#00f5a0', letterSpacing: '-0.02em' }}>
              SENTIFIELD AI
            </div>
            <div style={{ fontSize: '0.72rem', color: '#475569' }}>Farmer Dashboard</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(0,245,160,0.08)', border: '1px solid rgba(0,245,160,0.25)',
            borderRadius: '10px', padding: '0.4rem 0.8rem',
            fontSize: '0.85rem', color: '#00f5a0', fontWeight: '700',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg,#00f5a0,#00d9f5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: '900', color: '#030712',
            }}>
              {(user?.username || 'F').charAt(0).toUpperCase()}
            </span>
            {user?.username}
          </div>

          <button
            onClick={() => setIsVoiceModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(0,245,160,0.18) 0%, rgba(0,217,245,0.18) 100%)',
              border: '1.5px solid #00f5a0',
              borderRadius: '8px', padding: '0.45rem 0.9rem',
              color: '#00f5a0', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              boxShadow: '0 0 12px rgba(0,245,160,0.25)',
              transition: 'all 0.2s ease',
            }}
            title="Ask AI Voice Agronomist (Mic & Chat)"
          >
            🎙️ Voice Agronomist
          </button>

          {onViewMap && (
            <button
              onClick={() => onViewMap(activeFarm)}
              style={{
                background: 'rgba(0,217,245,0.15)',
                border: '1px solid rgba(0,217,245,0.4)',
                borderRadius: '8px', padding: '0.45rem 0.9rem',
                color: '#00d9f5', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
              title="Open Interactive Satellite Map"
            >
              🗺️ Map View
            </button>
          )}

          <button
            onClick={onAddNewFarm}
            style={{
              background: 'linear-gradient(135deg,#059669,#10b981)',
              border: 'none', borderRadius: '8px', padding: '0.45rem 0.9rem',
              color: '#fff', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}
          >
            ✏️ Draw New Farm
          </button>

          <button
            onClick={onLogout}
            style={{
              background: 'transparent', border: '1px solid rgba(255,51,102,0.35)',
              borderRadius: '8px', padding: '0.45rem 0.8rem',
              color: '#f87171', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 1.25rem', display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── SIDEBAR: FARM LIST ── */}
        <aside style={{
          background: 'rgba(8,16,32,0.85)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '1.1rem',
          position: 'sticky', top: '72px',
        }}>
          {/* Combined Portfolio Master Button */}
          <div
            onClick={() => {
              setViewMode('combined');
              setActiveFarmId(null);
            }}
            style={{
              background: viewMode === 'combined'
                ? 'linear-gradient(135deg, rgba(0,245,160,0.18) 0%, rgba(0,217,245,0.18) 100%)'
                : 'rgba(15,23,42,0.7)',
              border: viewMode === 'combined'
                ? '1.5px solid #00f5a0'
                : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '0.85rem 0.95rem',
              cursor: 'pointer',
              marginBottom: '1.1rem',
              boxShadow: viewMode === 'combined' ? '0 0 16px rgba(0,245,160,0.2)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🌐</span>
                <strong style={{ fontSize: '0.95rem', color: viewMode === 'combined' ? '#00f5a0' : '#ffffff' }}>
                  All Farms Combined
                </strong>
              </div>
              {portfolioData?.critical_count > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: '900',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '9999px',
                  boxShadow: '0 0 10px rgba(239,68,68,0.5)',
                }}>
                  {portfolioData.critical_count} URGENT
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              Operations Center • {portfolioData?.total_farms || savedFarms?.length || 0} Plots ({portfolioData?.total_acres || 0} ac)
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>
            Individual Farm Plots ({savedFarms?.length || 0})
          </div>

          {farmsLoading && (
            <div style={{ color: '#475569', fontSize: '0.85rem', padding: '0.5rem 0' }}>Loading farms…</div>
          )}

          {!farmsLoading && savedFarms?.length === 0 && (
            <div style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🌾</div>
              No farms saved yet.<br />
              <button
                onClick={onAddNewFarm}
                style={{ marginTop: '0.6rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#34d399', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
              >
                + Draw your first farm
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {savedFarms?.map((farm) => {
              const isActive = viewMode === 'single' && activeFarmId === farm.id;
              return (
                <div
                  key={farm.id}
                  onClick={() => selectFarm(farm)}
                  style={{
                    background: isActive ? 'rgba(0,245,160,0.1)' : 'rgba(15,23,42,0.6)',
                    border: isActive ? '1.5px solid rgba(0,245,160,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px', padding: '0.75rem 0.9rem',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 0 12px rgba(0,245,160,0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '1rem' }}>{CROP_ICONS[farm.crop_type] || '🌿'}</span>
                    <strong style={{ fontSize: '0.9rem', color: isActive ? '#00f5a0' : '#ffffff', lineHeight: 1.2 }}>
                      {farm.farm_name}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {farm.crop_type} · {farm.area_acres?.toFixed(2)} ac
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.15rem' }}>
                    📍 {farm.center_lat?.toFixed(4)}°, {farm.center_lon?.toFixed(4)}°
                  </div>
                  {isActive && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onChangeFarmLocation(farm); }}
                        style={{
                          flex: 1, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)',
                          borderRadius: '6px', padding: '0.3rem 0.4rem', color: '#60a5fa',
                          fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                        }}
                      >
                        📍 Change Location
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── MAIN PANEL ── */}
        <main style={{ minWidth: 0 }}>

          {/* ══════════════════════════════════════════════════════════════
              VIEW MODE 1: COMBINED MULTI-FARM OPERATIONS CENTER
             ══════════════════════════════════════════════════════════════ */}
          {viewMode === 'combined' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* TOP SUGGESTION HERO BANNER */}
              <div style={{
                background: portfolioData?.critical_count > 0
                  ? 'linear-gradient(135deg, rgba(220,38,38,0.2) 0%, rgba(15,23,42,0.95) 100%)'
                  : 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(15,23,42,0.95) 100%)',
                border: portfolioData?.critical_count > 0
                  ? '2px solid rgba(239,68,68,0.6)'
                  : '2px solid rgba(16,185,129,0.5)',
                borderRadius: '16px',
                padding: '1.4rem 1.6rem',
                boxShadow: portfolioData?.critical_count > 0
                  ? '0 6px 30px rgba(239,68,68,0.2)'
                  : '0 6px 30px rgba(16,185,129,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: portfolioData?.critical_count > 0 ? '#dc2626' : '#10b981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem', flexShrink: 0,
                  boxShadow: portfolioData?.critical_count > 0 ? '0 0 20px rgba(239,68,68,0.5)' : '0 0 20px rgba(16,185,129,0.5)'
                }}>
                  {portfolioData?.critical_count > 0 ? '🚨' : '✨'}
                </div>
                <div style={{ flex: '1 1 320px' }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: portfolioData?.critical_count > 0 ? '#f87171' : '#34d399',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em'
                  }}>
                    ▶ AI Operations Priority Directive
                  </div>
                  <h3 style={{
                    color: '#ffffff',
                    fontSize: '1.2rem',
                    fontWeight: '900',
                    margin: '0.3rem 0 0.2rem 0',
                    lineHeight: 1.4
                  }}>
                    {portfolioData?.top_suggestion || 'Aggregating crop health across your farm portfolio…'}
                  </h3>
                  {portfolioData?.highest_priority_farm && (
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
                      <span>Immediate Target: </span>
                      <strong style={{ color: '#00f5a0' }}>{portfolioData.highest_priority_farm.farm_name}</strong>
                      <span> ({portfolioData.highest_priority_farm.crop_type})</span>
                      <span style={{ margin: '0 0.5rem', color: '#475569' }}>•</span>
                      <span style={{ color: '#f87171' }}>{portfolioData.highest_priority_farm.problem_area_pct}% stressed zone</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    style={{
                      background: 'rgba(0, 245, 160, 0.15)',
                      border: '1.5px solid #00f5a0',
                      borderRadius: '10px',
                      padding: '0.75rem 1.1rem',
                      color: '#00f5a0',
                      fontSize: '0.86rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 0 15px rgba(0, 245, 160, 0.25)',
                    }}
                  >
                    🎙️ Ask AI Agronomist
                  </button>

                  <button
                    onClick={() => setIsDepthModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 217, 245, 0.18) 0%, rgba(99, 102, 241, 0.18) 100%)',
                      border: '1.5px solid #00d9f5',
                      borderRadius: '10px',
                      padding: '0.75rem 1.1rem',
                      color: '#00d9f5',
                      fontSize: '0.86rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 0 15px rgba(0, 217, 245, 0.25)',
                    }}
                    title="Upload leaf photo for Macro-to-Micro Depth Analysis"
                  >
                    🔬 Leaf Depth Analysis
                  </button>

                  {portfolioData?.highest_priority_farm && (
                    <button
                      onClick={() => {
                        const f = savedFarms.find(sf => sf.id === portfolioData.highest_priority_farm.farm_id);
                        if (f) selectFarm(f);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #00f5a0, #00d9f5)',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '0.75rem 1.3rem',
                        color: '#030712',
                        fontSize: '0.86rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '0 4px 18px rgba(0, 245, 160, 0.4)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Inspect Urgent Farm →
                    </button>
                  )}
                </div>
              </div>

              {/* PORTFOLIO STATS KPI ROW */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <StatChip label="Total Farm Plots" value={portfolioData?.total_farms || savedFarms?.length || 0} color="#00f5a0" />
                <StatChip label="Total Acreage" value={portfolioData?.total_acres?.toFixed(1) || 0} unit=" ac" color="#38bdf8" />
                <StatChip label="Urgent / Critical" value={portfolioData?.critical_count || 0} color="#f87171" unit=" plots" />
                <StatChip label="Needs Attention" value={portfolioData?.attention_count || 0} color="#fbbf24" unit=" plots" />
                <StatChip label="Optimal Health" value={portfolioData?.optimal_count || 0} color="#34d399" unit=" plots" />
                <StatChip label="Region Belt" value="Namakkal/Salem" color="#a78bfa" />
              </div>

              {/* SECTION 1: MASTER CROSS-FARM PRIORITY ACTION PLAN */}
              <div style={{
                background: 'rgba(8,16,32,0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '1.35rem 1.5rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      OPERATIONS MASTER WORKLIST
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', margin: '0.2rem 0 0 0' }}>
                      📋 Cross-Farm Priority Action Roadmap (One-By-One)
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                      All farm operations ranked by urgency score. Execute sequentially starting with #1 to prevent crop losses.
                    </p>
                  </div>

                  {/* Timeframe Filter Tabs */}
                  <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(15,23,42,0.8)', padding: '0.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {[
                      { key: 'all', label: `All Tasks (${portfolioData?.ranked_action_items?.length || 0})` },
                      { key: 'immediate', label: `Next 24-48h (${portfolioData?.ranked_action_items?.filter(i => i.timeframe_order === 1).length || 0})` },
                      { key: 'short_term', label: `Days 3-7 (${portfolioData?.ranked_action_items?.filter(i => i.timeframe_order === 2).length || 0})` },
                      { key: 'maintenance', label: `Days 8-14 (${portfolioData?.ranked_action_items?.filter(i => i.timeframe_order === 3).length || 0})` }
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setActionFilter(f.key)}
                        style={{
                          background: actionFilter === f.key ? 'rgba(0,245,160,0.18)' : 'transparent',
                          border: actionFilter === f.key ? '1px solid rgba(0,245,160,0.4)' : 'none',
                          borderRadius: '8px',
                          padding: '0.4rem 0.75rem',
                          color: actionFilter === f.key ? '#00f5a0' : '#94a3b8',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Task Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredActionItems.length === 0 && (
                    <div style={{ color: '#64748b', fontSize: '0.88rem', padding: '1rem', textAlign: 'center' }}>
                      No tasks matching this filter.
                    </div>
                  )}
                  {filteredActionItems.map((item) => {
                    const isCrit = item.urgency_level === 'CRITICAL';
                    const isAttn = item.urgency_level === 'ATTENTION';
                    const badgeColor = isCrit ? '#ef4444' : isAttn ? '#f59e0b' : '#10b981';

                    return (
                      <div
                        key={item.step_key}
                        style={{
                          background: item.is_completed
                            ? 'rgba(15,23,42,0.4)'
                            : isCrit
                              ? 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(15,23,42,0.85) 100%)'
                              : 'rgba(15,23,42,0.85)',
                          border: item.is_completed
                            ? '1px solid rgba(255,255,255,0.05)'
                            : `1.5px solid ${badgeColor}55`,
                          borderRadius: '12px',
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          opacity: item.is_completed ? 0.65 : 1,
                          transition: 'all 0.2s ease',
                          boxShadow: !item.is_completed && isCrit ? '0 0 16px rgba(239,68,68,0.1)' : 'none'
                        }}
                      >
                        {/* Priority Rank Badge */}
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: item.is_completed ? '#334155' : isCrit ? '#dc2626' : isAttn ? '#d97706' : '#059669',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#ffffff', fontWeight: '900', fontSize: '0.95rem',
                          flexShrink: 0
                        }}>
                          #{item.priority_rank}
                        </div>

                        {/* Task Checkbox */}
                        <input
                          type="checkbox"
                          checked={item.is_completed || false}
                          onChange={() => handleToggleCombinedStep(item)}
                          style={{
                            marginTop: '0.35rem',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#10b981',
                            flexShrink: 0
                          }}
                        />

                        {/* Task Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                            <span style={{
                              background: 'rgba(0, 245, 160, 0.12)',
                              color: '#00f5a0',
                              border: '1px solid rgba(0, 245, 160, 0.3)',
                              borderRadius: '6px',
                              padding: '0.15rem 0.55rem',
                              fontSize: '0.76rem',
                              fontWeight: '800'
                            }}>
                              {CROP_ICONS[item.crop_type] || '🌾'} {item.farm_name}
                            </span>

                            <span style={{
                              background: `${badgeColor}22`,
                              color: badgeColor,
                              border: `1px solid ${badgeColor}55`,
                              borderRadius: '6px',
                              padding: '0.15rem 0.5rem',
                              fontSize: '0.72rem',
                              fontWeight: '800'
                            }}>
                              {item.timeframe} • {item.urgency_level}
                            </span>

                            {item.is_completed && (
                              <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '700' }}>✓ Completed</span>
                            )}
                          </div>

                          <div style={{
                            fontSize: '0.98rem',
                            fontWeight: '800',
                            color: item.is_completed ? '#94a3b8' : '#ffffff',
                            textDecoration: item.is_completed ? 'line-through' : 'none'
                          }}>
                            {item.action}
                          </div>

                          <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            💡 <strong>Reason:</strong> {item.reason}
                          </div>
                        </div>

                        {/* Quick Jump Button */}
                        <button
                          onClick={() => {
                            const f = savedFarms.find(sf => sf.id === item.farm_id);
                            if (f) selectFarm(f);
                          }}
                          style={{
                            background: 'rgba(59,130,246,0.12)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: '8px',
                            padding: '0.45rem 0.85rem',
                            color: '#60a5fa',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          Inspect Farm →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: COMPARATIVE MULTI-FARM HEALTH MATRIX */}
              <div style={{
                background: 'rgba(8,16,32,0.85)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '1.35rem 1.5rem'
              }}>
                <div style={{ marginBottom: '1.1rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    FIELD-BY-FIELD PORTFOLIO MATRIX
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', margin: '0.2rem 0 0 0' }}>
                    🗺️ Separate Farm Health & Urgency Comparison
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                    Satellite vegetation vigor, problem area coverage, and live weather stress for each plot.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.1rem' }}>
                  {portfolioData?.farms?.map((farm) => {
                    const isCrit = farm.urgency_level === 'CRITICAL';
                    const isAttn = farm.urgency_level === 'ATTENTION';
                    const cardCol = isCrit ? '#ef4444' : isAttn ? '#f59e0b' : '#10b981';

                    return (
                      <div
                        key={farm.farm_id}
                        style={{
                          background: 'rgba(15,23,42,0.9)',
                          border: `1.5px solid ${cardCol}44`,
                          borderRadius: '14px',
                          padding: '1.2rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: isCrit ? '0 0 20px rgba(239,68,68,0.15)' : 'none'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>{CROP_ICONS[farm.crop_type] || '🌿'}</span>
                                <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>{farm.farm_name}</strong>
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.15rem' }}>
                                {farm.crop_type} • {farm.area_acres?.toFixed(2)} acres • 📍 {farm.center_lat?.toFixed(3)}°, {farm.center_lon?.toFixed(3)}°
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <HealthGradeBadge grade={farm.health_grade} />
                              <span style={{
                                marginTop: '0.35rem',
                                fontSize: '0.65rem',
                                fontWeight: '800',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '6px',
                                background: `${cardCol}22`,
                                color: cardCol,
                                border: `1px solid ${cardCol}55`
                              }}>
                                {farm.urgency_level}
                              </span>
                            </div>
                          </div>

                          {/* Quick stats row */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(8,16,32,0.6)', padding: '0.65rem 0.8rem', borderRadius: '10px', marginBottom: '0.85rem' }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Current NDVI</div>
                              <div style={{ fontSize: '1rem', fontWeight: '800', color: farm.ndvi >= 0.6 ? '#34d399' : farm.ndvi >= 0.5 ? '#fbbf24' : '#f87171' }}>
                                {farm.ndvi ? farm.ndvi.toFixed(2) : '—'} <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({farm.ndvi_delta || '—'})</span>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Stressed Area</div>
                              <div style={{ fontSize: '1rem', fontWeight: '800', color: isCrit ? '#f87171' : isAttn ? '#fbbf24' : '#34d399' }}>
                                {farm.problem_area_pct}% <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({farm.problem_area_acres} ac)</span>
                              </div>
                            </div>
                          </div>

                          {/* Top action directive */}
                          <div style={{ background: `${cardCol}11`, borderLeft: `3px solid ${cardCol}`, padding: '0.6rem 0.8rem', borderRadius: '6px', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.68rem', color: cardCol, fontWeight: '800', textTransform: 'uppercase' }}>
                              ▶ Next Priority Action:
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '700', marginTop: '0.2rem' }}>
                              {farm.top_priority_step}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              const f = savedFarms.find(sf => sf.id === farm.farm_id);
                              if (f) selectFarm(f);
                            }}
                            style={{
                              flex: 1,
                              background: 'linear-gradient(135deg, #059669, #10b981)',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '0.5rem',
                              color: '#ffffff',
                              fontSize: '0.82rem',
                              fontWeight: '800',
                              cursor: 'pointer'
                            }}
                          >
                            🔍 Deep Dive Farm
                          </button>
                          <button
                            onClick={() => {
                              const f = savedFarms.find(sf => sf.id === farm.farm_id);
                              if (onViewMap && f) onViewMap(f);
                            }}
                            style={{
                              background: 'rgba(0, 217, 245, 0.12)',
                              border: '1px solid rgba(0, 217, 245, 0.35)',
                              borderRadius: '8px',
                              padding: '0.5rem 0.75rem',
                              color: '#00d9f5',
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            title="View on interactive GIS map"
                          >
                            🗺️ Map
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              VIEW MODE 2: SINGLE-FARM DEEP DIVE VIEW
             ══════════════════════════════════════════════════════════════ */}
          {viewMode === 'single' && !activeFarm && !farmsLoading && (
            <div style={{
              background: 'rgba(8,16,32,0.7)', border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: '16px', padding: '3rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🛰️</div>
              <h2 style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: '800' }}>Select or Add a Farm Plot</h2>
              <p style={{ color: '#64748b', marginTop: '0.4rem' }}>
                Choose a farm from the sidebar or return to the combined operations center.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem' }}>
                <button onClick={() => setViewMode('combined')} style={{
                  background: 'rgba(0,245,160,0.15)', border: '1px solid rgba(0,245,160,0.4)',
                  borderRadius: '10px', padding: '0.75rem 1.4rem',
                  color: '#00f5a0', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer',
                }}>
                  🌐 All Farms Combined
                </button>
                <button onClick={onAddNewFarm} style={{
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem',
                  color: '#fff', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer',
                }}>
                  ✏️ Draw My Farm Boundary
                </button>
              </div>
            </div>
          )}

          {viewMode === 'single' && activeFarm && (
            <>
              {/* Back to Combined Operations Bar */}
              <div style={{
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '0.6rem 1rem'
              }}>
                <button
                  onClick={() => setViewMode('combined')}
                  style={{
                    background: 'rgba(0, 245, 160, 0.1)',
                    border: '1px solid rgba(0, 245, 160, 0.35)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    color: '#00f5a0',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  ← Back to All Farms Combined
                </button>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Viewing single plot: <strong style={{ color: '#ffffff' }}>{activeFarm.farm_name}</strong> ({activeFarm.crop_type})
                </div>
              </div>
              {/* ── FARM HEADER ── */}
              <div style={{
                background: 'rgba(8,16,32,0.85)', border: '1px solid rgba(0,245,160,0.2)',
                borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {healthGrade && <HealthGradeBadge grade={healthGrade} />}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Active Farm
                    </div>
                    <h2 style={{ fontSize: '1.55rem', fontWeight: '900', color: '#ffffff', margin: '0.1rem 0', lineHeight: 1.2 }}>
                      {CROP_ICONS[activeFarm.crop_type] || '🌿'} {activeFarm.farm_name}
                    </h2>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <span>🌾 {activeFarm.crop_type}</span>
                      <span>📐 {activeFarm.area_acres?.toFixed(2)} acres</span>
                      <span>📍 {activeFarm.center_lat?.toFixed(4)}°N, {activeFarm.center_lon?.toFixed(4)}°E</span>
                    </div>
                    {analyzedAt && (
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.3rem' }}>
                        📡 Last Analysis: {fmtDate(analyzedAt)}
                        {savingSteps && <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>• Saving progress…</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={runDeepAnalysis}
                    disabled={analysisLoading}
                    style={{
                      background: analysisLoading ? 'rgba(30,41,59,0.8)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                      border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem',
                      color: '#fff', fontSize: '0.88rem', fontWeight: '700', cursor: analysisLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      boxShadow: analysisLoading ? 'none' : '0 4px 16px rgba(124,58,237,0.4)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {analysisLoading ? '⏳ Analysing Satellite Data…' : '🛰️ Run Deep Analysis'}
                  </button>

                  <button
                    onClick={() => setIsDepthModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 217, 245, 0.18) 0%, rgba(99, 102, 241, 0.18) 100%)',
                      border: '1.5px solid #00d9f5',
                      borderRadius: '10px',
                      padding: '0.65rem 1.15rem',
                      color: '#00d9f5',
                      fontSize: '0.86rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 0 15px rgba(0, 217, 245, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                    title="Upload leaf photo for Macro-to-Micro Depth Analysis"
                  >
                    🔬 Leaf Depth Analysis
                  </button>

                  {cachedAnalysis?.pdf_download_url && (
                    <a
                      href={cachedAnalysis.pdf_download_url}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(59,130,246,0.4)',
                        borderRadius: '10px', padding: '0.65rem 1.1rem',
                        color: '#60a5fa', fontSize: '0.85rem', fontWeight: '700',
                        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem',
                      }}
                    >
                      📥 PDF Report
                    </a>
                  )}

                  {onViewMap && (
                    <button
                      onClick={() => onViewMap(activeFarm)}
                      style={{
                        background: 'rgba(0,217,245,0.12)', border: '1px solid rgba(0,217,245,0.3)',
                        borderRadius: '10px', padding: '0.65rem 1rem',
                        color: '#00d9f5', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                      }}
                      title="Inspect multispectral satellite tiles on full map"
                    >
                      🗺️ Map View
                    </button>
                  )}

                  <button
                    onClick={() => onChangeFarmLocation(activeFarm)}
                    style={{
                      background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.35)',
                      borderRadius: '10px', padding: '0.65rem 1rem',
                      color: '#60a5fa', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
                    }}
                  >
                    📍 Change Location
                  </button>
                </div>
              </div>

              {/* Analysis Error */}
              {analysisError && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '1rem',
                  color: '#fca5a5', fontSize: '0.9rem',
                }}>
                  ❌ <strong>Analysis Error:</strong> {analysisError}
                </div>
              )}

              {/* ── TABS ── */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'overview', label: '📊 Overview', show: true },
                  { key: 'timeline', label: '🗓️ Priority Timeline', show: !!cachedAnalysis?.gemini_recommendations?.action_plan },
                  { key: 'details', label: '🔬 Deep Details', show: !!cachedAnalysis },
                ].filter(t => t.show).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      background: activeTab === tab.key ? 'rgba(0,245,160,0.15)' : 'rgba(15,23,42,0.7)',
                      border: activeTab === tab.key ? '1.5px solid rgba(0,245,160,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px', padding: '0.5rem 1rem',
                      color: activeTab === tab.key ? '#00f5a0' : '#94a3b8',
                      fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── NO ANALYSIS YET ── */}
              {!cachedAnalysis && !analysisLoading && (
                <div style={{
                  background: 'rgba(8,16,32,0.7)', border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: '14px', padding: '2.5rem', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛰️</div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: '800' }}>No Satellite Analysis Yet</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.4rem 0 1.25rem 0' }}>
                    Run a deep analysis to get AI crop health diagnostics, weather correlation, and your priority action timeline.
                  </p>
                  <button onClick={runDeepAnalysis} style={{
                    background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none',
                    borderRadius: '10px', padding: '0.75rem 1.75rem',
                    color: '#fff', fontSize: '1rem', fontWeight: '800', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                  }}>
                    🛰️ Run First Satellite Analysis
                  </button>
                </div>
              )}

              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && cachedAnalysis && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Executive summary */}
                  {exec && (
                    <div style={{
                      background: 'rgba(15,23,42,0.9)', borderLeft: '4px solid #10b981',
                      borderRadius: '12px', padding: '1.1rem 1.25rem',
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        AI Agronomic Summary
                      </div>
                      <strong style={{ fontSize: '1.05rem', color: '#6ee7b7', display: 'block', marginBottom: '0.3rem' }}>
                        {typeof exec === 'object' ? exec.headline : 'Farm Health Diagnostic'}
                      </strong>
                      <p style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: 0, lineHeight: 1.55 }}>
                        {typeof exec === 'object' ? exec.farmer_friendly_message : exec}
                      </p>
                    </div>
                  )}

                  {/* Key metrics row */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <StatChip label="Current NDVI" value={ndviCurrent} color="#34d399" />
                    <StatChip label="Temperature" value={weather?.temperature_c} color="#f97316" unit="°C" />
                    <StatChip label="Humidity" value={weather?.humidity_pct} color="#38bdf8" unit="%" />
                    <StatChip label="7-Day Rainfall" value={weather?.rain_7day_sum_mm} color="#60a5fa" unit="mm" />
                    <StatChip label="14-Day Forecast" value={trend?.trend_status?.replace('_', ' ')} color="#a78bfa" />
                    <StatChip label="Farm Health Grade" value={healthGrade} color="#00f5a0" />
                  </div>

                  {/* Canopy health bar */}
                  {damage && (
                    <div style={{ background: 'rgba(8,16,32,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                        Canopy Health Distribution
                      </div>
                      <div style={{ display: 'flex', height: '18px', borderRadius: '9px', overflow: 'hidden', marginBottom: '0.65rem' }}>
                        <div style={{ width: `${damage.healthy_green?.percentage || 0}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', transition: 'width 0.8s ease' }} title="Healthy" />
                        <div style={{ width: `${damage.moderate_yellow?.percentage || 0}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} title="Moderate" />
                        <div style={{ width: `${damage.damaged_red?.percentage || 0}%`, background: 'linear-gradient(90deg,#dc2626,#ef4444)' }} title="Stressed" />
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                        <span style={{ color: '#34d399' }}>🟢 {damage.healthy_green?.percentage}% Healthy</span>
                        <span style={{ color: '#fbbf24' }}>🟡 {damage.moderate_yellow?.percentage}% Moderate</span>
                        <span style={{ color: '#f87171' }}>🔴 {damage.damaged_red?.percentage}% Stressed</span>
                      </div>
                    </div>
                  )}

                  {/* Problem zones + weather risks */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {problemZones && (
                      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>🗺️ Problem Zones</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffffff' }}>{problemZones.problem_area_percentage}%</div>
                        <div style={{ fontSize: '0.82rem', color: '#fca5a5', marginTop: '0.2rem' }}>{problemZones.problem_area_acres} acres affected</div>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem', margin: 0 }}>{problemZones.zone_description}</p>
                      </div>
                    )}
                    {weather?.risks && (
                      <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '12px', padding: '1rem 1.1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>🌧️ Weather Risks</div>
                        <div style={{ fontSize: '0.88rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span>Fungal Blight: <strong style={{ color: weather.risks.fungal_blight_risk === 'HIGH' ? '#f87171' : '#34d399' }}>{weather.risks.fungal_blight_risk}</strong></span>
                          <span>Drought Stress: <strong style={{ color: weather.risks.drought_stress_risk === 'HIGH' ? '#f87171' : '#34d399' }}>{weather.risks.drought_stress_risk}</strong></span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem', margin: 0 }}>{weather.risks.summary}</p>
                      </div>
                    )}
                  </div>

                  {/* Top priority step preview */}
                  {recs?.action_plan && (() => {
                    const immediateItems = recs.action_plan.immediate_24_48h || [];
                    const nextItem = immediateItems[0];
                    if (!nextItem) return null;
                    return (
                      <div style={{
                        background: 'linear-gradient(135deg,rgba(220,38,38,0.15) 0%,rgba(15,23,42,0.9) 100%)',
                        border: '1.5px solid rgba(239,68,68,0.5)', borderRadius: '14px', padding: '1.1rem 1.25rem',
                        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                        boxShadow: '0 4px 20px rgba(239,68,68,0.15)',
                      }}>
                        <div style={{
                          width: '46px', height: '46px', borderRadius: '50%',
                          background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem', flexShrink: 0, boxShadow: '0 0 16px rgba(239,68,68,0.4)',
                        }}>🚨</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            ▶ DO THIS NEXT — Immediate Priority
                          </div>
                          <strong style={{ fontSize: '1rem', color: '#ffffff', display: 'block', marginTop: '0.2rem' }}>{nextItem.action}</strong>
                          <p style={{ fontSize: '0.82rem', color: '#fca5a5', margin: '0.15rem 0 0 0' }}>{nextItem.reason}</p>
                        </div>
                        <button
                          onClick={() => setActiveTab('timeline')}
                          style={{
                            background: '#dc2626', border: 'none', borderRadius: '8px',
                            padding: '0.5rem 1rem', color: '#fff', fontSize: '0.82rem',
                            fontWeight: '700', cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          View Full Timeline →
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── TIMELINE TAB ── */}
              {activeTab === 'timeline' && cachedAnalysis?.gemini_recommendations?.action_plan && (
                <PriorityTimeline
                  actionPlan={cachedAnalysis.gemini_recommendations.action_plan}
                  initialCompleted={completedSteps}
                  onStepsChange={handleStepsChange}
                />
              )}

              {/* ── DEEP DETAILS TAB ── */}
              {activeTab === 'details' && cachedAnalysis && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Agronomic categories grid */}
                  {recs?.categories && (
                    <>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        🔬 AI Agronomic Category Breakdown
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1rem' }}>
                        {recs.categories.map((cat, idx) => {
                          const isCrit = cat.status === 'CRITICAL';
                          const isAttn = cat.status === 'ATTENTION';
                          const col = isCrit ? '#ef4444' : isAttn ? '#f59e0b' : '#10b981';
                          return (
                            <div key={idx} style={{
                              background: 'rgba(15,23,42,0.85)', border: `1px solid ${col}55`,
                              borderRadius: '12px', padding: '1rem 1.1rem',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
                                  <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{cat.title}</strong>
                                </div>
                                <span style={{
                                  fontSize: '0.68rem', fontWeight: '800', padding: '0.15rem 0.5rem',
                                  borderRadius: '8px', background: `${col}22`, color: col, border: `1px solid ${col}55`,
                                }}>{cat.status}</span>
                              </div>
                              <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: '0 0 0.6rem 0', fontStyle: 'italic' }}>"{cat.summary}"</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {cat.specific_actions?.map((act, ai) => (
                                  <div key={ai} style={{ display: 'flex', gap: '0.4rem', fontSize: '0.85rem', color: '#e2e8f0' }}>
                                    <span style={{ color: col }}>•</span>
                                    <span>{act}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Yield impact */}
                  {recs?.yield_impact && (
                    <div style={{
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)',
                      borderRadius: '12px', padding: '1.1rem 1.25rem',
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.35rem' }}>⚠️ Risk If No Action</div>
                        <p style={{ fontSize: '0.88rem', color: '#fde68a', margin: 0 }}>{recs.yield_impact.risk_if_no_action}</p>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.35rem' }}>💡 Recovery Potential</div>
                        <p style={{ fontSize: '0.88rem', color: '#bbf7d0', margin: 0 }}>
                          {recs.yield_impact.potential_gain_with_action}
                          {recs.yield_impact.estimated_recovery_days && ` (~${recs.yield_impact.estimated_recovery_days} days)`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 30-day comparison */}
                  {cachedAnalysis.historical_comparison && (
                    <div style={{ background: 'rgba(8,16,32,0.85)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.75rem' }}>📅 30-Day Growth Comparison</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', fontSize: '0.88rem' }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Historical NDVI</div>
                          <div style={{ color: '#94a3b8', fontWeight: '700', fontSize: '1.1rem' }}>{cachedAnalysis.historical_comparison.historical_mean_ndvi}</div>
                          <div style={{ color: '#475569', fontSize: '0.72rem' }}>{cachedAnalysis.historical_comparison.historical_date}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Current NDVI</div>
                          <div style={{ color: '#34d399', fontWeight: '700', fontSize: '1.1rem' }}>{cachedAnalysis.historical_comparison.current_mean_ndvi}</div>
                          <div style={{ color: '#475569', fontSize: '0.72rem' }}>Latest pass</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Growth Status</div>
                          <div style={{ color: '#60a5fa', fontWeight: '700', fontSize: '1rem' }}>{cachedAnalysis.historical_comparison.growth_status}</div>
                          <div style={{ color: '#475569', fontSize: '0.72rem' }}>{cachedAnalysis.historical_comparison.percentage_change}% change</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating AI Voice Agronomist Button */}
      <button
        onClick={() => setIsVoiceModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '26px',
          right: '26px',
          zIndex: 900,
          background: 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)',
          border: 'none',
          borderRadius: '9999px',
          padding: '0.8rem 1.35rem',
          color: '#030712',
          fontSize: '0.92rem',
          fontWeight: '900',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          boxShadow: '0 10px 30px rgba(0, 245, 160, 0.45), 0 0 20px rgba(0, 217, 245, 0.35)',
          transition: 'all 0.25s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)';
          e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 245, 160, 0.65)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 245, 160, 0.45), 0 0 20px rgba(0, 217, 245, 0.35)';
        }}
        title="Open Conversational Voice & Chat Agronomist"
      >
        <span style={{ fontSize: '1.25rem' }}>🎙️</span>
        <span>Ask AI Agronomist</span>
      </button>

      {/* Voice & Chat Agronomist Modal */}
      <VoiceAgronomistModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        activeContext={{
          contextMode: viewMode,
          activeFarm,
          portfolioSummary: portfolioData,
          analysisData: cachedAnalysis,
        }}
        token={token}
      />

      {/* Depth Analysis Modal (Leaf + Satellite Fusion) */}
      <DepthAnalysisModal
        isOpen={isDepthModalOpen}
        onClose={() => setIsDepthModalOpen(false)}
        activeContext={{
          activeFarm: activeFarm || {
            farm_name: portfolioData?.highest_priority_farm?.farm_name || 'My Farm Plot',
            crop_type: portfolioData?.highest_priority_farm?.crop_type || 'Crop',
            area_acres: portfolioData?.highest_priority_farm?.area_acres || 2.5,
          },
          analysisData: cachedAnalysis || (portfolioData?.highest_priority_farm ? {
            problem_zones: { problem_area_percentage: portfolioData.highest_priority_farm.problem_area_pct }
          } : null),
        }}
        token={token}
      />
    </div>
  );
}
