import React, { useState, useEffect, Component } from 'react';
import Header from './components/Header';
import Map from './components/Map';
import AuthModal from './components/AuthModal';
import SavedFarmsList from './components/SavedFarmsList';
import LaunchPortal from './components/LaunchPortal';
import PriorityTimeline from './components/PriorityTimeline';
import FarmerDashboard from './components/FarmerDashboard';
import VoiceAgronomistModal from './components/VoiceAgronomistModal';
import DepthAnalysisModal from './components/DepthAnalysisModal';

// Error Boundary Component to catch any UI Error cleanly
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Boundary Error Log:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</span>
          <h2 style={{ fontSize: '1.6rem', color: '#00f5a0', fontWeight: '900', marginBottom: '0.5rem' }}>SENTIFIELD AI</h2>
          <p style={{ color: '#cbd5e1', maxWidth: '500px', marginBottom: '1.5rem' }}>
            Click below to load your dashboard cleanly.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '0.75rem 1.75rem',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            🔄 Open App Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainDashboard() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [geeStatus, setGeeStatus] = useState(null);

  // Map state
  const [mapCenter, setMapCenter] = useState([11.2320, 78.1480]); // Namakkal Agricultural Belt, TN
  const [zoomLevel, setZoomLevel] = useState(16);
  const [markerPosition, setMarkerPosition] = useState([11.2320, 78.1480]);
  const [mapLayer, setMapLayer] = useState('google_hybrid');
  const [activePassTile, setActivePassTile] = useState(null);
  const [activePassDate, setActivePassDate] = useState(null);
  const [timelineViewMode, setTimelineViewMode] = useState('cards'); // 'cards' or 'table'

  // Search & GPS
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLocationName, setSearchLocationName] = useState('Namakkal, Tamil Nadu, India');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Drawing state
  const [farmData, setFarmData] = useState(null);

  // Confirmation, GEE & Analysis state
  const [expectedArea, setExpectedArea] = useState('');
  const [validationLoading, setValidationLoading] = useState(false);
  const [confirmedSession, setConfirmedSession] = useState(null);
  const [geePreparedData, setGeePreparedData] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  // Launch Portal vs Active Dashboard Role State ('guest', 'farmer', or null for launch portal)
  const [appMode, setAppMode] = useState(() => {
    try {
      const stored = localStorage.getItem('farmer_user');
      if (stored) return 'farmer';
      const guestMode = sessionStorage.getItem('sentifield_mode');
      return guestMode || null;
    } catch {
      return null;
    }
  });
  const [authModalInitialTab, setAuthModalInitialTab] = useState('login');

  // Farmer Auth & Multi-Farm Persistence state
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('farmer_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('farmer_token'));
  const [savedFarms, setSavedFarms] = useState([]);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [showFarmsList, setShowFarmsList] = useState(true);
  const [farmerView, setFarmerView] = useState('dashboard'); // 'dashboard' | 'map'
  const [editingFarm, setEditingFarm] = useState(null); // farm object being edited
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeSavedFarmId, setActiveSavedFarmId] = useState(null);
  const [saveFarmName, setSaveFarmName] = useState('');
  const [saveCropType, setSaveCropType] = useState('Paddy / Rice');
  const [saveFarmLoading, setSaveFarmLoading] = useState(false);
  const [saveFarmSuccess, setSaveFarmSuccess] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isDepthModalOpen, setIsDepthModalOpen] = useState(false);

  const fetchSavedFarms = async (authToken) => {
    const t = authToken || token;
    if (!t) return;
    setFarmsLoading(true);
    try {
      const res = await fetch('/api/farms', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedFarms(data.farms || []);
      }
    } catch (err) {
      console.error('Failed to load saved farms:', err);
    } finally {
      setFarmsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSavedFarms(token);
    }
  }, [token]);

  const handleSelectGuest = () => {
    sessionStorage.setItem('sentifield_mode', 'guest');
    setAppMode('guest');
  };

  const handleOpenFarmerLogin = () => {
    setAuthModalInitialTab('login');
    setIsAuthModalOpen(true);
  };

  const handleOpenFarmerRegister = () => {
    setAuthModalInitialTab('register');
    setIsAuthModalOpen(true);
  };

  const handleQuickDemo = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo_farmer', password: 'farm123' }),
      });
      if (res.ok) {
        const data = await res.json();
        handleAuthSuccess(data.user, data.token);
      } else {
        handleOpenFarmerLogin();
      }
    } catch {
      handleOpenFarmerLogin();
    }
  };

  const handleOpenPortal = () => {
    sessionStorage.removeItem('sentifield_mode');
    setAppMode(null);
  };

  const handleAuthSuccess = (authedUser, authToken) => {
    setUser(authedUser);
    setToken(authToken);
    setAppMode('farmer');
    sessionStorage.setItem('sentifield_mode', 'farmer');
    setFarmerView('dashboard');
    fetchSavedFarms(authToken);
    setShowFarmsList(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('farmer_token');
    localStorage.removeItem('farmer_user');
    sessionStorage.removeItem('sentifield_mode');
    setUser(null);
    setToken(null);
    setSavedFarms([]);
    setActiveSavedFarmId(null);
    setEditingFarm(null);
    setFarmerView('dashboard');
    setAppMode(null); // Return to Launch Portal
  };

  const handleAddNewFarmFromDashboard = () => {
    setEditingFarm(null);
    setFarmData(null);
    setConfirmedSession(null);
    setAnalysisData(null);
    setValidationError(null);
    setSaveFarmName('');
    setFarmerView('map');
  };

  const handleChangeFarmLocation = (farm) => {
    setEditingFarm(farm);
    setActiveSavedFarmId(farm.id);
    setSaveFarmName(farm.farm_name || '');
    setSaveCropType(farm.crop_type || 'Paddy / Rice');
    setMapCenter([farm.center_lat, farm.center_lon]);
    setMarkerPosition([farm.center_lat, farm.center_lon]);
    setZoomLevel(16);
    setSearchLocationName(`${farm.farm_name} (${farm.crop_type})`);
    setFarmData({
      geojson: farm.geojson,
      area: {
        acres: farm.area_acres,
        sqMeters: farm.area_sq_m,
        hectares: farm.area_sq_m / 10000.0,
      },
      perimeterMeters: 0,
      isFinal: true,
    });
    setConfirmedSession(null);
    setAnalysisData(null);
    setValidationError(null);
    setFarmerView('map');
  };

  const handleViewMapFromDashboard = (farm) => {
    setEditingFarm(null);
    if (farm) {
      handleSelectSavedFarm(farm);
    }
    setFarmerView('map');
  };

  const handleUpdateFarmLocation = async () => {
    if (!editingFarm || !token || !farmData?.geojson) return;
    setSaveFarmLoading(true);
    setSaveFarmSuccess(null);
    try {
      const res = await fetch(`/api/farms/${editingFarm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          geojson: farmData.geojson,
          farm_name: editingFarm.farm_name,
          crop_type: editingFarm.crop_type,
          area_acres: farmData.area?.acres,
          area_sq_m: farmData.area?.sqMeters,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update farm location');

      setSaveFarmSuccess(`Location updated for "${editingFarm.farm_name}"!`);
      await fetchSavedFarms(token);
      setEditingFarm(null);
      setTimeout(() => {
        setSaveFarmSuccess(null);
        setFarmerView('dashboard');
      }, 1200);
    } catch (err) {
      alert(err.message || 'Error updating farm location');
    } finally {
      setSaveFarmLoading(false);
    }
  };

  const handleSaveCurrentFarm = async () => {
    if (!user || !token) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!farmData || !farmData.geojson) return;

    setSaveFarmLoading(true);
    setSaveFarmSuccess(null);
    try {
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          farm_name: saveFarmName.trim() || 'My Farm Plot',
          crop_type: saveCropType,
          geojson: farmData.geojson,
          area_acres: farmData.area?.acres,
          area_sq_m: farmData.area?.sqMeters,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save farm');

      setSaveFarmSuccess(`Saved "${saveFarmName.trim() || 'My Farm Plot'}" successfully!`);
      setSaveFarmName('');
      await fetchSavedFarms(token);
      setTimeout(() => {
        setSaveFarmSuccess(null);
        setFarmerView('dashboard');
      }, 1200);
    } catch (err) {
      alert(err.message || 'Error saving farm');
    } finally {
      setSaveFarmLoading(false);
    }
  };

  const handleDeleteSavedFarm = async (farmId, farmName) => {
    if (!window.confirm(`Are you sure you want to remove farm "${farmName}" from your saved list?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/farms/${farmId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSavedFarms((prev) => prev.filter((f) => f.id !== farmId));
        if (activeSavedFarmId === farmId) {
          setActiveSavedFarmId(null);
        }
      }
    } catch (err) {
      console.error('Delete farm error:', err);
    }
  };

  const handleSelectSavedFarm = async (farm) => {
    setActiveSavedFarmId(farm.id);
    setSearchLocationName(`${farm.farm_name} (${farm.crop_type})`);

    setMapCenter([farm.center_lat, farm.center_lon]);
    setMarkerPosition([farm.center_lat, farm.center_lon]);
    setZoomLevel(16);

    const farmObj = {
      geojson: farm.geojson,
      area: {
        acres: farm.area_acres,
        sqMeters: farm.area_sq_m,
        hectares: farm.area_sq_m / 10000.0,
      },
      perimeterMeters: 0,
      isFinal: true,
    };

    setFarmData(farmObj);
    setConfirmedSession(null);
    setAnalysisData(null);
    setValidationError(null);

    // Auto-run validation & satellite analysis in 1 click!
    try {
      setValidationLoading(true);
      const vResponse = await fetch('/api/farm/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geojson: farm.geojson }),
      });

      if (!vResponse.ok) {
        const errData = await vResponse.json();
        throw new Error(errData.detail || 'Farm validation failed');
      }

      const vData = await vResponse.json();
      setConfirmedSession(vData);

      const gResponse = await fetch('/api/gee/prepare-farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_session_id: vData.farm_session_id,
          geojson: farm.geojson,
        }),
      });

      if (gResponse.ok) {
        const gData = await gResponse.json();
        setGeePreparedData(gData);
        fetchLatestSatelliteAnalysis(vData.farm_session_id, farm.geojson);
      }
    } catch (err) {
      console.error('Saved farm analysis error:', err);
      setValidationError(err.message || 'Failed to analyze saved farm');
    } finally {
      setValidationLoading(false);
    }
  };

  const fetchHealthAndGee = async () => {
    setHealthLoading(true);
    try {
      const [hRes, gRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/gee/status'),
      ]);

      if (hRes.ok) setHealth(await hRes.json());
      if (gRes.ok) setGeeStatus(await gRes.json());
    } catch (err) {
      console.error('Failed to fetch system health / GEE status:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndGee();
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const results = await res.json();

      if (results && results.length > 0) {
        const topResult = results[0];
        const newLat = parseFloat(topResult.lat);
        const newLon = parseFloat(topResult.lon);

        setMapCenter([newLat, newLon]);
        setMarkerPosition([newLat, newLon]);
        setZoomLevel(16);
        setSearchLocationName(topResult.display_name);
      } else {
        alert(`No coordinates found for location: "${searchQuery}". Please check city/village name.`);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      alert('Failed to connect to location geocoding service.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleGPSClick = () => {
    if (!navigator.geolocation) {
      alert('Browser Geolocation is not supported by your device.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        setMapCenter([userLat, userLon]);
        setMarkerPosition([userLat, userLon]);
        setZoomLevel(17);
        setSearchLocationName(`Device GPS Location (${userLat.toFixed(5)}, ${userLon.toFixed(5)})`);
        setGpsLoading(false);
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsLoading(false);
        alert(`GPS Access Error: ${err.message}. Please enable location permissions in your browser.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePolygonChange = (polygonResult) => {
    setFarmData(polygonResult);
    if (!polygonResult) {
      setConfirmedSession(null);
      setGeePreparedData(null);
      setAnalysisData(null);
      setValidationError(null);
      setActivePassTile(null);
      setActivePassDate(null);
    }
  };

  const handleConfirmFarm = async () => {
    if (!farmData || !farmData.geojson) return;

    setValidationLoading(true);
    setValidationError(null);

    const payload = {
      geojson: farmData.geojson,
      expected_area_acres: expectedArea ? parseFloat(expectedArea) : null,
    };

    try {
      const vResponse = await fetch('/api/farm/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!vResponse.ok) {
        const errData = await vResponse.json();
        throw new Error(errData.detail || 'Farm validation failed');
      }

      const vData = await vResponse.json();
      setConfirmedSession(vData);

      const gResponse = await fetch('/api/gee/prepare-farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_session_id: vData.farm_session_id,
          geojson: farmData.geojson,
        }),
      });

      if (gResponse.ok) {
        const gData = await gResponse.json();
        setGeePreparedData(gData);
        fetchLatestSatelliteAnalysis(vData.farm_session_id, farmData.geojson);
      }
    } catch (err) {
      console.error('Farm confirmation error:', err);
      setValidationError(err.message || 'Failed to validate farm polygon');
    } finally {
      setValidationLoading(false);
    }
  };

  const fetchLatestSatelliteAnalysis = async (sessionId, geojson) => {
    setAnalysisLoading(true);
    try {
      const response = await fetch('/api/satellite/analyze-latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_session_id: sessionId,
          geojson: geojson,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errorMsg = errJson?.detail || 'Failed to retrieve satellite analysis. Please try redrawing your farm boundary.';
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setAnalysisData(data);
      setValidationError(null);
      setMapLayer('ee_rgb'); // Direct Sentinel-2 True Color Satellite Map as default layer!
      if (data?.passes_30days_6days && data.passes_30days_6days.length > 0) {
        setActivePassDate(data.passes_30days_6days[0].acquisition_date);
      }
    } catch (err) {
      console.error('Latest analysis error:', err);
      setValidationError(err.message || 'Satellite analysis failed. Please try redrawing your farm boundary.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleSelectPassDate = (passObj) => {
    if (!passObj) return;
    setActivePassDate(passObj.acquisition_date);
    if (passObj.map_tile_url) {
      setActivePassTile(passObj.map_tile_url);
      setMapLayer('ee_rgb');
    }
  };

  // Render Launch Portal if role has not been selected yet
  if (!appMode && !user) {
    return (
      <div className="app-container">
        <LaunchPortal
          onSelectGuest={handleSelectGuest}
          onOpenFarmerLogin={handleOpenFarmerLogin}
          onOpenFarmerRegister={handleOpenFarmerRegister}
          onQuickDemo={handleQuickDemo}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          initialTab={authModalInitialTab}
        />
      </div>
    );
  }

  // Render Dedicated Farmer Dashboard when authenticated and in dashboard view
  if (user && farmerView === 'dashboard') {
    return (
      <div className="app-container">
        <FarmerDashboard
          user={user}
          token={token}
          savedFarms={savedFarms}
          farmsLoading={farmsLoading}
          onAddNewFarm={handleAddNewFarmFromDashboard}
          onChangeFarmLocation={handleChangeFarmLocation}
          onViewMap={handleViewMapFromDashboard}
          onRefreshFarms={() => fetchSavedFarms(token)}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          initialTab={authModalInitialTab}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header
        status={health}
        loading={healthLoading}
        user={user}
        appMode={appMode}
        onOpenPortal={handleOpenPortal}
        onOpenAuth={handleOpenFarmerLogin}
        onLogout={handleLogout}
        savedFarmsCount={savedFarms.length}
        onToggleFarms={() => setShowFarmsList(!showFarmsList)}
        showFarmsList={showFarmsList}
        farmerView={farmerView}
        onToggleFarmerView={() => setFarmerView(farmerView === 'dashboard' ? 'map' : 'dashboard')}
        onOpenVoiceAgent={user ? () => setIsVoiceModalOpen(true) : null}
      />

      <main className="main-content">
        {/* Farmer Map Mode Banner with Quick Return */}
        {user && (
          <div style={{
            background: editingFarm ? 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(15,23,42,0.95))' : 'rgba(0, 245, 160, 0.08)',
            border: editingFarm ? '1.5px solid #3b82f6' : '1px solid rgba(0, 245, 160, 0.3)',
            borderRadius: '16px',
            padding: '0.85rem 1.4rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
            boxShadow: editingFarm ? '0 4px 20px rgba(59,130,246,0.25)' : '0 4px 20px rgba(0, 245, 160, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
              <span style={{ fontSize: '1.3rem' }}>{editingFarm ? '📍' : '🌾'}</span>
              <div>
                <strong>
                  {editingFarm
                    ? `Editing Location for: "${editingFarm.farm_name}" (${editingFarm.crop_type})`
                    : `Interactive Satellite Map Mode (Farmer: ${user.username})`}
                </strong>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {editingFarm
                    ? 'Click to redraw/adjust boundary points on the map, then click Update below.'
                    : 'Draw or inspect farm polygons and overlay Sentinel-2 NDVI multispectral data.'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {editingFarm ? (
                <>
                  <button
                    onClick={handleUpdateFarmLocation}
                    disabled={saveFarmLoading || !farmData?.geojson}
                    className="btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      padding: '0.45rem 1.1rem',
                      fontSize: '0.82rem',
                    }}
                  >
                    {saveFarmLoading ? 'Saving...' : '💾 Update Farm Location'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingFarm(null);
                      setFarmerView('dashboard');
                    }}
                    className="btn-secondary"
                    style={{
                      padding: '0.45rem 0.8rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setFarmerView('dashboard')}
                  className="btn-secondary"
                  style={{
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.82rem',
                    color: '#00f5a0',
                    borderColor: 'rgba(0, 245, 160, 0.4)',
                    background: 'rgba(0, 245, 160, 0.08)',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Farmer Dashboard
                </button>
              )}
            </div>
          </div>
        )}
        {/* Guest Agronomist Mode Banner */}
        {!user && appMode === 'guest' && (
          <div style={{
            background: 'rgba(0, 217, 245, 0.08)',
            border: '1px solid rgba(0, 217, 245, 0.25)',
            borderRadius: '16px',
            padding: '0.85rem 1.4rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
            boxShadow: '0 4px 20px rgba(0, 217, 245, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
              <span style={{ fontSize: '1.25rem' }}>🌍</span>
              <span><strong>Guest Agronomist Sandbox:</strong> Instant satellite field analysis mode active. Draw and analyze fields freely.</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={handleOpenFarmerLogin}
                className="btn-primary"
                style={{
                  padding: '0.4rem 0.95rem',
                  fontSize: '0.82rem',
                }}
              >
                👨‍🌾 Sign In to Save Plots
              </button>
              <button
                onClick={handleOpenPortal}
                className="btn-secondary"
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                }}
              >
                ⇄ Switch Role
              </button>
            </div>
          </div>
        )}

        {/* Saved Farms Panel for Logged-In Farmer */}
        {user && showFarmsList && (
          <SavedFarmsList
            farms={savedFarms}
            loading={farmsLoading}
            onSelectFarm={handleSelectSavedFarm}
            onDeleteFarm={handleDeleteSavedFarm}
            activeFarmId={activeSavedFarmId}
            onClose={() => setShowFarmsList(false)}
          />
        )}

        {/* Toolbar: Location Search & GPS */}
        <section className="toolbar-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="toolbar-title">
              <span>📍 Agricultural Target Location:</span>
              <span style={{ color: '#34d399', fontWeight: '800' }}>{searchLocationName}</span>
            </div>
            {/* Quick Regional Center Shortcuts */}
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Farming Hubs:</span>
              {[
                { name: 'Namakkal', subtitle: 'Paddy & Layer Belt', lat: 11.2320, lon: 78.1480 },
                { name: 'Thanjavur', subtitle: 'Delta Rice Basin', lat: 10.7950, lon: 79.1620 },
                { name: 'Coimbatore', subtitle: 'Cotton & Agro-Tech', lat: 10.9850, lon: 76.9150 },
                { name: 'Erode', subtitle: 'Turmeric & Sugarcane', lat: 11.3150, lon: 77.6850 },
                { name: 'Madurai', subtitle: 'Vegetables & Millets', lat: 9.9650, lon: 78.1550 }
              ].map(loc => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    setMapCenter([loc.lat, loc.lon]);
                    setMarkerPosition([loc.lat, loc.lon]);
                    setZoomLevel(16);
                    setSearchLocationName(`${loc.name} (${loc.subtitle})`);
                  }}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.78rem',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontWeight: '600'
                  }}
                >
                  📍 {loc.name}
                </button>
              ))}
            </div>
          </div>

          <div className="search-controls">
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="input-search"
                placeholder="Search city, village, or town (e.g. Namakkal)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={searchLoading}>
                {searchLoading ? 'Locating...' : '🔍 Locate Field'}
              </button>
            </form>

            <button onClick={handleGPSClick} className="btn-secondary" disabled={gpsLoading}>
              {gpsLoading ? 'Acquiring GPS...' : '🎯 Device GPS'}
            </button>
          </div>
        </section>

        {/* Map Component */}
        <Map
          center={mapCenter}
          zoom={zoomLevel}
          markerPosition={markerPosition}
          mapLayer={mapLayer}
          setMapLayer={setMapLayer}
          onPolygonChange={handlePolygonChange}
          eeMapTiles={activePassTile ? { red_green_health: activePassTile, rgb: analysisData?.map_tiles?.rgb, nir_false_color: analysisData?.map_tiles?.nir_false_color } : analysisData?.map_tiles}
          selectedDate={activePassDate || analysisData?.observation_details?.acquisition_date}
          externalPolygon={farmData?.geojson || null}
        />

        {!farmData && (
          <div className="draw-prompt">
            <span style={{ fontSize: '1.75rem' }}>✏️</span>
            <div>
              <strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>How to Select Your Farm Field:</strong>
              <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>
                1. Click <strong>"✏️ Start Drawing Farm Boundary"</strong> above the map.
                <br />
                2. Click corners around an active crop field (add as many points as needed).
                <br />
                3. Click <strong>"✅ Finish Polygon"</strong> when done!
              </p>
            </div>
          </div>
        )}

        {/* Farm Area Calculation & GEE Integration Card */}
        {farmData && farmData.area && (
          <section className="farm-card">
            <div className="farm-card-header">
              <div className="farm-title">
                <span>🌾 Farm Boundary Selected & Calculated</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-ready">
                  {confirmedSession ? '✅ Boundary Validated' : 'Polygon Ready'}
                </span>
                {geePreparedData && (
                  <span className="badge badge-ready" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                    🛰️ GEE Integrated
                  </span>
                )}
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Farm Area (Acres)</div>
                <div className="stat-value">{(farmData.area.acres || 0).toFixed(2)} acres</div>
                <div className="stat-sub">Geodesic Area</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Farm Area (Hectares)</div>
                <div className="stat-value">{(farmData.area.hectares || 0).toFixed(3)} ha</div>
                <div className="stat-sub">Metric Hectares</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Farm Area (Square Meters)</div>
                <div className="stat-value">{Math.round(farmData.area.sqMeters || 0).toLocaleString()} m²</div>
                <div className="stat-sub">Exact m² Geometry</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Farm Perimeter</div>
                <div className="stat-value">{Math.round(farmData.perimeterMeters || 0).toLocaleString()} m</div>
                <div className="stat-sub">Boundary Edge Length</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Optional Expected Farm Area (Acres):
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input-search"
                  placeholder="e.g. 1.0"
                  value={expectedArea}
                  onChange={(e) => setExpectedArea(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {expectedArea && Math.abs(farmData.area.acres - parseFloat(expectedArea)) > 0.25 * parseFloat(expectedArea) && (
              <div className="alert-warning">
                ⚠️ <strong>Area Discrepancy Notice:</strong> Your expected area ({parseFloat(expectedArea).toFixed(2)} acres) differs from the detected polygon geometry area ({farmData.area.acres.toFixed(2)} acres).
              </div>
            )}

            {validationError && (
              <div className="alert-warning" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}>
                ❌ <strong>Validation Error:</strong> {validationError}
              </div>
            )}

            {confirmedSession && (
              <div className="alert-success">
                ✅ <strong>Farm Boundary Confirmed!</strong>
                <br />
                <strong>Session ID:</strong> <code>{confirmedSession.farm_session_id}</code>
                <br />
                <strong>Location Center:</strong> {confirmedSession.center?.latitude}° N, {confirmedSession.center?.longitude}° E
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleConfirmFarm}
                className="btn-primary"
                disabled={validationLoading || confirmedSession}
                style={{ padding: '0.8rem 1.75rem', fontSize: '1rem' }}
              >
                {validationLoading
                  ? 'Fetching Direct Sentinel-2 Satellite Maps...'
                  : confirmedSession
                  ? '✓ Farm Confirmed & Sentinel Map Integrated'
                  : 'ANALYZE CROP HEALTH & SENTINEL MAP'}
              </button>

              <button
                onClick={() => setFarmData(null)}
                className="btn-secondary"
                style={{ padding: '0.8rem 1.5rem', fontSize: '0.95rem' }}
              >
                🔄 REDRAW BOUNDARY
              </button>

              <button
                onClick={() => setIsDepthModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 217, 245, 0.18) 0%, rgba(99, 102, 241, 0.18) 100%)',
                  border: '1.5px solid #00d9f5',
                  color: '#00d9f5',
                  borderRadius: '10px',
                  padding: '0.8rem 1.4rem',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 0 16px rgba(0, 217, 245, 0.25)',
                }}
                title="Upload leaf photo for Macro-to-Micro Depth Analysis"
              >
                <span>🔬</span>
                <span>Leaf Depth Analysis</span>
              </button>
            </div>

            {/* SAVE FARM TO PROFILE SECTION */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {user ? (
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(52, 211, 153, 0.25)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>💾</span>
                      <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>Save This Farm to Farmer Profile</strong>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Logged in as <strong style={{ color: '#34d399' }}>{user.full_name || user.username}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Farm Name (e.g. North Paddy Field)"
                      value={saveFarmName}
                      onChange={(e) => setSaveFarmName(e.target.value)}
                      style={{
                        flex: '1 1 200px',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.9rem',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />

                    <select
                      value={saveCropType}
                      onChange={(e) => setSaveCropType(e.target.value)}
                      style={{
                        flex: '0 0 160px',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.9rem',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    >
                      <option value="Paddy / Rice">🌾 Paddy / Rice</option>
                      <option value="Cotton">🌱 Cotton</option>
                      <option value="Sugarcane">🎋 Sugarcane</option>
                      <option value="Maize / Corn">🌽 Maize / Corn</option>
                      <option value="Wheat">🌾 Wheat</option>
                      <option value="Vegetables / Tomato">🍅 Vegetables / Tomato</option>
                      <option value="Coconut">🥥 Coconut</option>
                      <option value="Banana">🍌 Banana</option>
                      <option value="General Crop">🌿 General Crop</option>
                    </select>

                    {editingFarm ? (
                      <>
                        <button
                          onClick={handleUpdateFarmLocation}
                          disabled={saveFarmLoading}
                          style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.65rem 1.25rem',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            cursor: saveFarmLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                          }}
                        >
                          {saveFarmLoading ? 'Updating...' : `💾 Update "${editingFarm.farm_name}"`}
                        </button>
                        <button
                          onClick={() => {
                            setEditingFarm(null);
                            setFarmerView('dashboard');
                          }}
                          style={{
                            background: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            padding: '0.65rem 0.9rem',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleSaveCurrentFarm}
                        disabled={saveFarmLoading}
                        style={{
                          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.65rem 1.25rem',
                          fontWeight: '700',
                          fontSize: '0.9rem',
                          cursor: saveFarmLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        {saveFarmLoading ? 'Saving...' : '💾 Save Farm'}
                      </button>
                    )}
                  </div>

                  {saveFarmSuccess && (
                    <div style={{ marginTop: '0.6rem', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>✓</span> {saveFarmSuccess}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#cbd5e1' }}>
                    <span>💡</span>
                    <span>Want to save this boundary for instant 1-click analysis anytime?</span>
                  </div>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '8px',
                      padding: '0.45rem 0.9rem',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    👤 Login / Register as Farmer
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* LOADING INDICATOR */}
        {analysisLoading && (
          <div className="draw-prompt" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399', marginTop: '2rem' }}>
            <span style={{ fontSize: '1.75rem' }}>⏳</span>
            <div>
              <strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>Integrating Direct Satellite Map Telemetry...</strong>
              <p style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>
                Streaming True Color Multispectral satellite telemetry directly onto your map canvas.
              </p>
            </div>
          </div>
        )}

        {/* NON-AGRICULTURAL / BUILDING WARNING BANNER */}
        {analysisData && analysisData.land_safety && !analysisData.land_safety.is_farmland && (
          <section className="farm-card" style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', marginTop: '2rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '2.8rem' }}>🏢</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: '800', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    NON-FARMLAND DETECTED
                  </span>
                  <h3 style={{ color: '#f87171', fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>
                    Building / Non-Agricultural Structure Detected
                  </h3>
                </div>
                <p style={{ color: '#fca5a5', fontSize: '1rem', lineHeight: '1.6', margin: '0.5rem 0' }}>
                  {analysisData.land_safety.warning || "⚠️ Building Detected: The selected area is a building rooftop, house, concrete structure, or non-farmland. Satellite crop health monitoring and fertilizer guidance cannot be run on buildings."}
                </p>
                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setFarmData(null);
                      setConfirmedSession(null);
                      setAnalysisData(null);
                      setValidationError(null);
                      setActivePassDate(null);
                    }}
                    className="btn-primary"
                    style={{ background: '#dc2626', fontSize: '1rem', fontWeight: '700', padding: '0.75rem 1.5rem' }}
                  >
                    🌾 Try Any Other Farming Place
                  </button>
                  <span style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                    Click above to clear this selection and draw a boundary over active farmland.
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ENTERPRISE DASHBOARD WITH DIRECT SENTINEL-2 MAP INTEGRATION */}
        {analysisData && (
          <>
            {/* Executive Summary Bar & PDF Download */}
            <section className="farm-card" style={{ borderColor: 'rgba(52, 211, 153, 0.4)', marginTop: '2rem' }}>
              <div className="farm-card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div className="farm-title" style={{ color: '#34d399', fontSize: '1.35rem' }}>
                    <span>🛰️ Multispectral Precision Agriculture Dashboard ({activePassDate || analysisData.observation_details?.acquisition_date})</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Sensor Observation Payload: <strong style={{ color: '#ffffff' }}>{analysisData.observation_details?.spacecraft}</strong> | Active Acquisition Pass: <strong style={{ color: '#38bdf8' }}>{activePassDate || analysisData.observation_details?.acquisition_date}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.35rem',
                      color: '#030712',
                      fontSize: '0.92rem',
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

                  <button
                    onClick={() => setIsDepthModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 217, 245, 0.18) 0%, rgba(99, 102, 241, 0.18) 100%)',
                      border: '1.5px solid #00d9f5',
                      borderRadius: '8px',
                      padding: '0.75rem 1.35rem',
                      color: '#00d9f5',
                      fontSize: '0.92rem',
                      fontWeight: '900',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 0 16px rgba(0, 217, 245, 0.25)',
                    }}
                    title="Upload leaf image for unified satellite + leaf pathology depth analysis"
                  >
                    <span>🔬</span>
                    <span>Leaf Depth Analysis</span>
                  </button>

                  {analysisData.pdf_download_url && (
                    <a
                      href={analysisData.pdf_download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                        textDecoration: 'none',
                        padding: '0.75rem 1.4rem',
                        fontSize: '0.92rem',
                        boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.5)'
                      }}
                    >
                      📥 Download Executive PDF Report
                    </a>
                  )}
                </div>
              </div>

              {/* COMPOSITE CANOPY HEALTH DISTRIBUTION BAR */}
              {analysisData.crop_damage_health && (
                <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Canopy Health & Vegetative Stress Distribution
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: '800' }}>
                      {analysisData.crop_damage_health.healthy_green?.percentage}% Dominant Healthy Canopy
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    height: '14px',
                    borderRadius: '7px',
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.6)'
                  }}>
                    <div style={{ width: `${analysisData.crop_damage_health.healthy_green?.percentage || 0}%`, background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)' }} title="Healthy" />
                    <div style={{ width: `${analysisData.crop_damage_health.moderate_yellow?.percentage || 0}%`, background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }} title="Moderate" />
                    <div style={{ width: `${analysisData.crop_damage_health.damaged_red?.percentage || 0}%`, background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)', boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }} title="Stressed / Damaged" />
                  </div>
                </div>
              )}

              {/* RED VS GREEN CROP DAMAGE BREAKDOWN */}
              {analysisData.crop_damage_health && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                  <div style={{ background: 'rgba(22, 163, 74, 0.15)', border: '2px solid #16a34a', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 8px 20px -6px rgba(22, 163, 74, 0.3)' }}>
                    <div style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: '800', letterSpacing: '0.04em' }}>🟢 HEALTHY CROPS (VIGOROUS)</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ffffff', margin: '0.3rem 0' }}>{analysisData.crop_damage_health.healthy_green?.percentage}%</div>
                    <p style={{ fontSize: '0.85rem', color: '#bbf7d0', margin: 0 }}>Optimal photosynthetic activity & chlorophyll content.</p>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 8px 20px -6px rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ fontSize: '0.82rem', color: '#fbbf24', fontWeight: '800', letterSpacing: '0.04em' }}>🟡 MODERATE CANOPY GROWTH</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ffffff', margin: '0.3rem 0' }}>{analysisData.crop_damage_health.moderate_yellow?.percentage}%</div>
                    <p style={{ fontSize: '0.85rem', color: '#fef08a', margin: 0 }}>Canopy transition zone requiring monitoring.</p>
                  </div>

                  <div style={{ background: 'rgba(220, 38, 38, 0.18)', border: '2px solid #dc2626', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 8px 20px -6px rgba(220, 38, 38, 0.3)' }}>
                    <div style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: '800', letterSpacing: '0.04em' }}>🔴 STRESSED / WATER DEFICIT</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ffffff', margin: '0.3rem 0' }}>{analysisData.crop_damage_health.damaged_red?.percentage}%</div>
                    <p style={{ fontSize: '0.85rem', color: '#fca5a5', margin: 0 }}>Stressed vegetation or moisture deficit zone.</p>
                  </div>
                </div>
              )}
            </section>



            {/* 30-DAY TIMELINE (6 DEDUPLICATED 5-DAY REVISIT PASSES) */}
            {analysisData.passes_30days_6days && analysisData.passes_30days_6days.length > 0 && (
              <section className="farm-card" style={{ borderColor: '#3b82f6', marginTop: '1.5rem' }}>
                <div className="farm-card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                  <div className="farm-title" style={{ color: '#60a5fa' }}>
                    <span>📅 30-Day Sentinel-2 Satellite Passes (Unique 5-Day Revisit Dates)</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-ready" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                      {analysisData.passes_30days_6days.length} Unique Dates
                    </span>
                    <button
                      onClick={() => setTimelineViewMode('cards')}
                      className={`layer-chip ${timelineViewMode === 'cards' ? 'active' : ''}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                      🎴 Cards View
                    </button>
                    <button
                      onClick={() => setTimelineViewMode('table')}
                      className={`layer-chip ${timelineViewMode === 'table' ? 'active' : ''}`}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                      📊 Table View
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                  Sentinel-2 satellite recaptures your farm <strong>every 5 days</strong>. Below are the <strong>6 unique satellite pass dates</strong> over the last 30 days. Multiple overlapping granules on the same day are deduplicated and filtered for cloud cover (&lt;30%).
                </p>

                {/* VIEW MODE 1: CARDS GRID */}
                {timelineViewMode === 'cards' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    {analysisData.passes_30days_6days.map((passItem) => {
                      const isSelected = activePassDate === passItem.acquisition_date;
                      return (
                        <div
                          key={passItem.image_id}
                          style={{
                            background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(15, 23, 42, 0.7)',
                            border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '1rem',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleSelectPassDate(passItem)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#60a5fa' }}>PASS #{passItem.pass_number}</span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: passItem.crop_status === 'HEALTHY' ? 'rgba(16,185,129,0.2)' : passItem.crop_status === 'MODERATE' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                              color: passItem.crop_status === 'HEALTHY' ? '#34d399' : passItem.crop_status === 'MODERATE' ? '#fbbf24' : '#f87171',
                            }}>
                              {passItem.crop_status}
                            </span>
                          </div>

                          <strong style={{ fontSize: '1.1rem', color: '#ffffff', display: 'block', marginBottom: '0.3rem' }}>
                            📅 {passItem.acquisition_date}
                          </strong>

                          <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>
                            Mean NDVI: <strong>{passItem.mean_ndvi}</strong> ({passItem.spacecraft})
                            <br />
                            Cloud Cover: <strong>{passItem.cloud_percentage}%</strong>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPassDate(passItem);
                            }}
                            className={isSelected ? 'btn-primary' : 'btn-secondary'}
                            style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '0.45rem' }}
                          >
                            {isSelected ? '✓ Active Map Date' : '🛰️ View Sentinel-2 Map'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* VIEW MODE 2: TABLE VIEW */}
                {timelineViewMode === 'table' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', color: '#cbd5e1' }}>
                      <thead>
                        <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '2px solid #3b82f6', textAlign: 'left' }}>
                          <th style={{ padding: '0.75rem 1rem', color: '#60a5fa' }}>Pass #</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#ffffff' }}>Acquisition Date</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>Time (UTC)</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>Satellite</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>Cloud Cover</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#34d399' }}>Mean NDVI</th>
                          <th style={{ padding: '0.75rem 1rem', color: '#ffffff' }}>Health Category</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisData.passes_30days_6days.map((passItem) => {
                          const isSelected = activePassDate === passItem.acquisition_date;
                          return (
                            <tr
                              key={passItem.image_id}
                              style={{
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                              }}
                            >
                              <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#60a5fa' }}>#{passItem.pass_number}</td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#ffffff' }}>📅 {passItem.acquisition_date}</td>
                              <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>{passItem.acquisition_time}</td>
                              <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>{passItem.spacecraft}</td>
                              <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>{passItem.cloud_percentage}%</td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#34d399' }}>{passItem.mean_ndvi}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '4px',
                                  background: passItem.crop_status === 'HEALTHY' ? 'rgba(16,185,129,0.2)' : passItem.crop_status === 'MODERATE' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                                  color: passItem.crop_status === 'HEALTHY' ? '#34d399' : passItem.crop_status === 'MODERATE' ? '#fbbf24' : '#f87171',
                                }}>
                                  {passItem.crop_status}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleSelectPassDate(passItem)}
                                  className={isSelected ? 'btn-primary' : 'btn-secondary'}
                                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
                                >
                                  {isSelected ? '✓ Active' : '🛰️ View Map'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* 4 HIGH-VALUE FEATURE CARDS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              
              {/* FEATURE 1: 📅 HISTORICAL 30-DAY CROP HEALTH COMPARISON */}
              {analysisData.historical_comparison && (
                <section className="farm-card" style={{ borderColor: '#3b82f6' }}>
                  <div className="farm-card-header">
                    <div className="farm-title" style={{ color: '#60a5fa' }}>
                      <span>📅 30-Day Growth Comparison</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>Pass #6 (30 Days Ago - {analysisData.historical_comparison.historical_date}):</span>
                      <strong style={{ color: '#ffffff' }}>NDVI {analysisData.historical_comparison.historical_mean_ndvi}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>Pass #1 (Current Pass - {analysisData.observation_details?.acquisition_date}):</span>
                      <strong style={{ color: '#34d399' }}>NDVI {analysisData.historical_comparison.current_mean_ndvi}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>30-Day Growth Trajectory:</span>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        background: analysisData.historical_comparison.growth_status === 'IMPROVED' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                        color: analysisData.historical_comparison.growth_status === 'IMPROVED' ? '#34d399' : '#60a5fa'
                      }}>
                        {analysisData.historical_comparison.growth_status} ({analysisData.historical_comparison.percentage_change}%)
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.4rem', margin: 0 }}>
                      {analysisData.historical_comparison.summary}
                    </p>
                  </div>
                </section>
              )}

              {/* FEATURE 2: 🗺️ FIELD ZONING / PROBLEM AREA DETECTION */}
              {analysisData.problem_zones && (
                <section className="farm-card" style={{ borderColor: '#ef4444' }}>
                  <div className="farm-card-header">
                    <div className="farm-title" style={{ color: '#f87171' }}>
                      <span>🗺️ Field Zoning / Problem Areas</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#94a3b8' }}>Problem Sub-Zone Area:</span>
                      <strong style={{ color: '#f87171' }}>{analysisData.problem_zones.problem_area_acres} acres ({analysisData.problem_zones.problem_area_percentage}%)</strong>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${analysisData.problem_zones.problem_area_percentage}%`, height: '100%', background: '#ef4444', borderRadius: '4px' }} />
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.4rem', margin: 0 }}>
                      {analysisData.problem_zones.zone_description}
                    </p>
                  </div>
                </section>
              )}

              {/* FEATURE 3: 🌧️ WEATHER + CROP HEALTH CORRELATION */}
              {analysisData.weather_correlation && (
                <section className="farm-card" style={{ borderColor: '#38bdf8' }}>
                  <div className="farm-card-header">
                    <div className="farm-title" style={{ color: '#38bdf8' }}>
                      <span>🌧️ Live Ag-Weather Correlation</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Temperature:</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff' }}>{analysisData.weather_correlation.temperature_c}°C</div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Humidity:</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff' }}>{analysisData.weather_correlation.humidity_pct}%</div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>7-Day Rainfall:</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#38bdf8' }}>{analysisData.weather_correlation.rain_7day_sum_mm} mm</div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Water Loss (ET₀):</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fbbf24' }}>{analysisData.weather_correlation.evapotranspiration_7d_mm} mm</div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '0.75rem', margin: 0 }}>
                    {analysisData.weather_correlation.risks?.summary}
                  </p>
                </section>
              )}

              {/* FEATURE 4: 🔮 14-DAY CROP HEALTH TREND PREDICTION */}
              {analysisData.trend_prediction && (
                <section className="farm-card" style={{ borderColor: '#a78bfa' }}>
                  <div className="farm-card-header">
                    <div className="farm-title" style={{ color: '#a78bfa' }}>
                      <span>🔮 14-Day AI Growth Trend Forecast</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#94a3b8' }}>14-Day Forecast Trajectory:</span>
                      <strong style={{ color: '#a78bfa' }}>{analysisData.trend_prediction.trend_status?.replace('_', ' ')}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: '#94a3b8' }}>Predicted Future NDVI:</span>
                      <strong style={{ color: '#ffffff' }}>NDVI {analysisData.trend_prediction.predicted_future_ndvi}</strong>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.4rem', margin: 0 }}>
                      {analysisData.trend_prediction.summary}
                    </p>
                  </div>
                </section>
              )}

            </div>

            {/* AUTONOMOUS AGRONOMIC DECISION INTELLIGENCE DASHBOARD */}
            {analysisData.gemini_recommendations && (
              <section className="farm-card" style={{ marginTop: '2rem', borderColor: '#10b981', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)' }}>
                <div className="farm-card-header" style={{ flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '1rem' }}>
                  <div>
                    <div className="farm-title" style={{ color: '#34d399', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span>🧠 Autonomous Agronomic Decision Intelligence Engine</span>
                      <span style={{
                        background: analysisData.gemini_recommendations.is_ai_generated ? 'rgba(0, 245, 160, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        border: analysisData.gemini_recommendations.is_ai_generated ? '1px solid rgba(0, 245, 160, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)',
                        color: analysisData.gemini_recommendations.is_ai_generated ? '#00f5a0' : '#38bdf8',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '800'
                      }}>
                        {analysisData.gemini_recommendations.is_ai_generated ? '⚡ Gemini AI Active & Connected' : '🧠 Decision Diagnostic Engine'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                      Multispectral Satellite Telemetry & Agro-Climatic Synthesis Model: <strong style={{ color: '#38bdf8' }}>{analysisData.gemini_recommendations.model_used || 'Neural Agronomic Advisory Engine'}</strong>
                    </p>
                  </div>

                  {analysisData.gemini_recommendations.executive_summary?.overall_health_grade && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '2px solid #10b981',
                      borderRadius: '12px',
                      padding: '0.5rem 1.25rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: '800' }}>Farm Health Grade</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ffffff', lineHeight: 1 }}>
                        {analysisData.gemini_recommendations.executive_summary.overall_health_grade}
                      </div>
                    </div>
                  )}
                </div>

                {/* EXECUTIVE SUMMARY BANNER */}
                {analysisData.gemini_recommendations.executive_summary && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    borderLeft: '5px solid #10b981',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    marginTop: '1.25rem',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                  }}>
                    <strong style={{ fontSize: '1.15rem', color: '#6ee7b7', display: 'block', marginBottom: '0.4rem' }}>
                      {typeof analysisData.gemini_recommendations.executive_summary === 'object'
                        ? analysisData.gemini_recommendations.executive_summary.headline
                        : 'Agronomic Diagnostic Summary'}
                    </strong>
                    <p style={{ fontSize: '0.96rem', color: '#e2e8f0', lineHeight: '1.5', margin: 0 }}>
                      {typeof analysisData.gemini_recommendations.executive_summary === 'object'
                        ? analysisData.gemini_recommendations.executive_summary.farmer_friendly_message
                        : analysisData.gemini_recommendations.executive_summary}
                    </p>
                  </div>
                )}

                {/* 4 AGRONOMIC CATEGORIES GRID */}
                {analysisData.gemini_recommendations.categories && analysisData.gemini_recommendations.categories.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                    {analysisData.gemini_recommendations.categories.map((cat, idx) => {
                      const isCritical = cat.status === 'CRITICAL';
                      const isAttention = cat.status === 'ATTENTION';
                      const borderCol = isCritical ? '#ef4444' : isAttention ? '#f59e0b' : '#10b981';
                      const bgGradient = isCritical ? 'rgba(239, 68, 68, 0.12)' : isAttention ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)';

                      return (
                        <div key={idx} style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: `1px solid ${borderCol}`,
                          borderRadius: '12px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.6rem' }}>{cat.icon}</span>
                                <h4 style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: '700' }}>{cat.title}</h4>
                              </div>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px',
                                background: bgGradient,
                                color: borderCol,
                                border: `1px solid ${borderCol}`
                              }}>
                                {cat.status}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '0.85rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px' }}>
                              "{cat.summary}"
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <strong style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Farmer Action Steps:</strong>
                              {cat.specific_actions && cat.specific_actions.map((act, aIdx) => (
                                <div key={aIdx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', color: '#f1f5f9', alignItems: 'flex-start' }}>
                                  <span style={{ color: borderCol, fontWeight: '700' }}>•</span>
                                  <span style={{ lineHeight: '1.4' }}>{act}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {cat.metrics_correlation && (
                            <div style={{ marginTop: '1rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.78rem', color: '#64748b' }}>
                              📊 {cat.metrics_correlation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PRIORITY-BASED FARM DEVELOPMENT TIMELINE */}
                {analysisData.gemini_recommendations.action_plan && (
                  <PriorityTimeline actionPlan={analysisData.gemini_recommendations.action_plan} />
                )}

                {/* YIELD IMPACT & RECOVERY INSIGHT */}
                {analysisData.gemini_recommendations.yield_impact && (
                  <div style={{
                    marginTop: '1.25rem',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <strong style={{ color: '#fbbf24', fontSize: '0.95rem', display: 'block' }}>
                        ⚠️ Risk If No Action Taken:
                      </strong>
                      <p style={{ fontSize: '0.88rem', color: '#fef08a', margin: '0.2rem 0 0 0' }}>
                        {analysisData.gemini_recommendations.yield_impact.risk_if_no_action}
                      </p>
                    </div>

                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <strong style={{ color: '#34d399', fontSize: '0.95rem', display: 'block' }}>
                        💡 Expected Recovery With Recommended Actions:
                      </strong>
                      <p style={{ fontSize: '0.88rem', color: '#bbf7d0', margin: '0.2rem 0 0 0' }}>
                        {analysisData.gemini_recommendations.yield_impact.potential_gain_with_action} (Estimated Recovery: ~{analysisData.gemini_recommendations.yield_impact.estimated_recovery_days || 7} Days)
                      </p>
                    </div>
                  </div>
                )}

              </section>
            )}
          </>
        )}

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          initialTab={authModalInitialTab}
        />

        {/* Floating AI Voice Agronomist Button: Only shown for authenticated Farmers, or in Guest Mode AFTER plot analysis is complete */}
        {(user || Boolean(analysisData)) && (
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            style={{
              position: 'fixed',
              bottom: '26px',
              right: '26px',
              zIndex: 999,
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
        )}

        {/* Voice & Chat Agronomist Modal for Guest / Map */}
        <VoiceAgronomistModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          activeContext={{
            contextMode: 'single',
            activeFarm: {
              farm_name: searchLocationName || 'Marked Farm Field',
              crop_type: saveCropType || 'Crop',
              area_acres: farmData?.area?.acres || analysisData?.statistics?.area_acres || 0,
            },
            analysisData: analysisData,
          }}
          token={token}
        />

        {/* Depth Analysis Modal (Leaf + Satellite Fusion) */}
        <DepthAnalysisModal
          isOpen={isDepthModalOpen}
          onClose={() => setIsDepthModalOpen(false)}
          activeContext={{
            activeFarm: {
              farm_name: searchLocationName || 'Marked Farm Field',
              crop_type: saveCropType || 'Crop',
              area_acres: farmData?.area?.acres || analysisData?.statistics?.area_acres || 0,
            },
            analysisData: analysisData,
          }}
          token={token}
        />
      </main>

      <footer className="footer">
        <p>© 2026 SENTIFIELD AI — Autonomous Multispectral Remote Sensing & Precision Agro-Intelligence</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainDashboard />
    </ErrorBoundary>
  );
}
