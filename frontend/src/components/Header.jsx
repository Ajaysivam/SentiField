import React from 'react';

export default function Header({
  status,
  loading,
  user,
  appMode,
  onOpenPortal,
  onOpenAuth,
  onLogout,
  savedFarmsCount = 0,
  onToggleFarms,
  showFarmsList,
  farmerView,
  onToggleFarmerView,
  onOpenVoiceAgent,
}) {
  return (
    <header className="header">
      <div className="brand" onClick={onOpenPortal} title="Return to SENTIFIELD AI Launchpad">
        <div className="brand-icon">S</div>
        <div className="brand-title">
          <h1>SENTIFIELD AI</h1>
          <p>Autonomous Multispectral Crop Intelligence</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        {/* Mode Indicator Chip */}
        <div
          onClick={onOpenPortal}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.8rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: '800',
            background: user ? 'rgba(0, 245, 160, 0.12)' : 'rgba(0, 217, 245, 0.12)',
            border: user ? '1px solid rgba(0, 245, 160, 0.35)' : '1px solid rgba(0, 217, 245, 0.35)',
            color: user ? '#00f5a0' : '#00d9f5',
          }}
          title="Click to change portal access role"
        >
          <span>{user ? 'Farmer Access' : 'Guest Mode'}</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>⇄ Switch</span>
        </div>

        {/* Real-time System Telemetry */}
        <div className="status-pill" title="Diagnostic Telemetry Status">
          <span className={`status-dot ${loading ? 'offline' : status?.status === 'ok' ? 'online' : 'offline'}`}></span>
          <span style={{ color: status?.status === 'ok' ? '#00f5a0' : '#ff3366' }}>
            {loading ? 'Connecting...' : status?.status === 'ok' ? 'Telemetry Live' : 'Offline'}
          </span>
        </div>

        {/* Live Database Explorer Link */}
        <a
          href="http://127.0.0.1:8000/db"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'rgba(8, 16, 32, 0.85)',
            border: '1px solid rgba(0, 245, 160, 0.3)',
            color: '#00f5a0',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: '700',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            textDecoration: 'none',
          }}
          title="Open live SQLite database table viewer in browser"
        >
          <span>Database</span>
        </a>

        {/* AI Voice Agronomist Button (Available for Authenticated Farmers) */}
        {user && onOpenVoiceAgent && (
          <button
            onClick={onOpenVoiceAgent}
            style={{
              background: 'linear-gradient(135deg, rgba(0, 245, 160, 0.18) 0%, rgba(0, 217, 245, 0.18) 100%)',
              border: '1.5px solid #00f5a0',
              color: '#00f5a0',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 0 12px rgba(0, 245, 160, 0.25)',
              transition: 'all 0.2s ease',
            }}
            title="Ask AI Voice Agronomist (English, Tamil, Hindi)"
          >
            <span>Ask AI Agronomist</span>
          </button>
        )}

        {/* Controls: Farmer vs Guest */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {onToggleFarmerView && (
              <button
                onClick={onToggleFarmerView}
                className="btn-secondary"
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.85rem',
                  color: '#00f5a0',
                  borderColor: 'rgba(0, 245, 160, 0.4)',
                  background: 'rgba(0, 245, 160, 0.08)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <span>{farmerView === 'map' ? 'Dashboard' : 'Map View'}</span>
              </button>
            )}

            <button
              onClick={onToggleFarms}
              className="btn-primary"
              style={{
                background: showFarmsList
                  ? 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)'
                  : 'rgba(8, 16, 32, 0.9)',
                border: '1px solid rgba(0, 245, 160, 0.4)',
                color: showFarmsList ? '#030712' : '#00f5a0',
                padding: '0.45rem 0.95rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: showFarmsList ? '0 0 16px rgba(0, 245, 160, 0.4)' : 'none',
              }}
            >
              <span>Saved Plots</span>
              <span
                style={{
                  background: showFarmsList ? '#030712' : '#00f5a0',
                  color: showFarmsList ? '#00f5a0' : '#030712',
                  fontWeight: '900',
                  borderRadius: '9999px',
                  padding: '0.1rem 0.45rem',
                  fontSize: '0.75rem',
                }}
              >
                {savedFarmsCount}
              </span>
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(8, 16, 32, 0.85)',
                padding: '0.4rem 0.85rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '0.86rem',
                color: '#f8fafc',
              }}
            >
              <span
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: '900',
                  color: '#030712',
                }}
              >
                {user.username ? user.username.charAt(0).toUpperCase() : 'F'}
              </span>
              <strong style={{ color: '#ffffff' }}>{user.full_name || user.username}</strong>
            </div>

            <button
              onClick={onLogout}
              className="btn-secondary"
              style={{
                padding: '0.45rem 0.8rem',
                fontSize: '0.82rem',
                color: '#ff3366',
                borderColor: 'rgba(255, 51, 102, 0.3)',
              }}
              title="Log out of farmer account"
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={onOpenAuth}
              className="btn-primary"
              style={{
                padding: '0.45rem 1.1rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span>Farmer Login</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
