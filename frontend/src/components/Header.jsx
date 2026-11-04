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
  theme = 'dark',
  onToggleTheme,
}) {
  const isLight = theme === 'light';

  return (
    <header className="header">
      <div className="brand" onClick={onOpenPortal} title="Return to SENTIFIELD AI Launchpad">
        <div className="brand-icon">S</div>
        <div className="brand-title">
          <h1 style={{ color: isLight ? '#0f172a' : '#ffffff' }}>SENTIFIELD AI</h1>
          <p>Autonomous Multispectral Crop Intelligence</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
            background: user
              ? isLight ? 'rgba(5, 150, 105, 0.12)' : 'rgba(0, 245, 160, 0.12)'
              : isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(0, 217, 245, 0.12)',
            border: user
              ? isLight ? '1px solid rgba(5, 150, 105, 0.35)' : '1px solid rgba(0, 245, 160, 0.35)'
              : isLight ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid rgba(0, 217, 245, 0.35)',
            color: user
              ? isLight ? '#059669' : '#00f5a0'
              : isLight ? '#0284c7' : '#00d9f5',
          }}
          title="Click to change portal access role"
        >
          <span>{user ? 'Farmer Access' : 'Guest Mode'}</span>
          <span style={{ fontSize: '0.7rem', color: isLight ? '#64748b' : '#94a3b8' }}>Switch</span>
        </div>

        {/* Real-time System Telemetry */}
        <div
          className="status-pill"
          style={{
            background: isLight ? '#f8fafc' : 'rgba(8, 16, 32, 0.8)',
            border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)',
          }}
          title="Diagnostic Telemetry Status"
        >
          <span className={`status-dot ${loading ? 'offline' : status?.status === 'ok' ? 'online' : 'offline'}`}></span>
          <span style={{ color: status?.status === 'ok' ? (isLight ? '#059669' : '#00f5a0') : '#dc2626' }}>
            {loading ? 'Connecting...' : status?.status === 'ok' ? 'Telemetry Live' : 'Offline'}
          </span>
        </div>

        {/* Live Database Explorer Link */}
        <a
          href="http://127.0.0.1:8000/db"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: isLight ? '#f8fafc' : 'rgba(8, 16, 32, 0.85)',
            border: isLight ? '1px solid rgba(5, 150, 105, 0.3)' : '1px solid rgba(0, 245, 160, 0.3)',
            color: isLight ? '#059669' : '#00f5a0',
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

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            style={{
              background: isLight ? '#f1f5f9' : 'rgba(8, 16, 32, 0.85)',
              border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isLight ? '#0f172a' : '#f8fafc',
              padding: '0.35rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
          >
            <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        )}

        {/* AI Voice Agronomist Button (Available for Authenticated Farmers) */}
        {user && onOpenVoiceAgent && (
          <button
            onClick={onOpenVoiceAgent}
            style={{
              background: isLight
                ? 'rgba(5, 150, 105, 0.1)'
                : 'linear-gradient(135deg, rgba(0, 245, 160, 0.18) 0%, rgba(0, 217, 245, 0.18) 100%)',
              border: isLight ? '1.5px solid #059669' : '1.5px solid #00f5a0',
              color: isLight ? '#059669' : '#00f5a0',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: isLight ? '0 1px 4px rgba(0, 0, 0, 0.05)' : '0 0 12px rgba(0, 245, 160, 0.25)',
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
                  color: isLight ? '#059669' : '#00f5a0',
                  borderColor: isLight ? 'rgba(5, 150, 105, 0.4)' : 'rgba(0, 245, 160, 0.4)',
                  background: isLight ? '#ffffff' : 'rgba(0, 245, 160, 0.08)',
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
                  ? (isLight ? '#059669' : 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)')
                  : (isLight ? '#ffffff' : 'rgba(8, 16, 32, 0.9)'),
                border: isLight ? '1px solid #059669' : '1px solid rgba(0, 245, 160, 0.4)',
                color: showFarmsList
                  ? '#ffffff'
                  : (isLight ? '#059669' : '#00f5a0'),
                padding: '0.45rem 0.95rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: showFarmsList ? (isLight ? '0 2px 8px rgba(5, 150, 105, 0.3)' : '0 0 16px rgba(0, 245, 160, 0.4)') : 'none',
              }}
            >
              <span>Saved Plots</span>
              <span
                style={{
                  background: showFarmsList ? '#ffffff' : (isLight ? '#059669' : '#00f5a0'),
                  color: showFarmsList ? '#059669' : (isLight ? '#ffffff' : '#030712'),
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
                background: isLight ? '#f8fafc' : 'rgba(8, 16, 32, 0.85)',
                padding: '0.4rem 0.85rem',
                borderRadius: '12px',
                border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '0.86rem',
                color: isLight ? '#0f172a' : '#f8fafc',
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
              <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{user.full_name || user.username}</strong>
            </div>

            <button
              onClick={onLogout}
              className="btn-secondary"
              style={{
                padding: '0.45rem 0.8rem',
                fontSize: '0.82rem',
                color: '#dc2626',
                borderColor: 'rgba(220, 38, 38, 0.3)',
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
