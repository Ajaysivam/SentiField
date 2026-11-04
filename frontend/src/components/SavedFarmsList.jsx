import React from 'react';

export default function SavedFarmsList({
  farms = [],
  loading = false,
  onSelectFarm,
  onDeleteFarm,
  activeFarmId = null,
  onClose,
  theme = 'dark',
}) {
  const isLight = theme === 'light';

  return (
    <section
      className="farm-card"
      style={{
        borderColor: isLight ? '#cbd5e1' : 'rgba(52, 211, 153, 0.4)',
        background: isLight ? '#ffffff' : 'rgba(11, 18, 33, 0.92)',
        boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.05)' : 'none',
        marginBottom: '1.6rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: isLight ? '#ecfdf5' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
            border: isLight ? '1px solid #86efac' : '1px solid rgba(52, 211, 153, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.82rem',
            fontWeight: '900',
            color: isLight ? '#047857' : '#34d399',
          }}>
            PLOTS
          </div>
          <div>
            <h3 style={{ color: isLight ? '#0f172a' : '#ffffff', fontSize: '1.25rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              Farmer Registered Plots <span style={{ color: isLight ? '#047857' : '#34d399', fontSize: '1rem', fontWeight: '700' }}>({farms.length})</span>
            </h3>
            <p style={{ color: isLight ? '#475569' : '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
              Select any saved parcel for instant map positioning and 1-click multispectral crop diagnostics.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
          >
            Close Drawer
          </button>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: isLight ? '#64748b' : '#94a3b8', padding: '1.5rem' }}>
          Loading your registered farm plots...
        </div>
      )}

      {!loading && farms.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem 1.5rem',
          background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.6)',
          borderRadius: '14px',
          border: isLight ? '1px dashed #cbd5e1' : '1px dashed rgba(255, 255, 255, 0.15)'
        }}>
          <p style={{ color: isLight ? '#0f172a' : '#cbd5e1', fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>
            No farm plots saved yet in this profile
          </p>
          <p style={{ color: isLight ? '#475569' : '#94a3b8', fontSize: '0.88rem', marginTop: '0.4rem', maxWidth: '450px', margin: '0.4rem auto 0 auto' }}>
            Draw a boundary polygon around any field on the map below, then click <strong>"Save Farm"</strong> to store it permanently.
          </p>
        </div>
      )}

      {!loading && farms.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.15rem' }}>
          {farms.map((farm) => {
            const isSelected = activeFarmId === farm.id;

            return (
              <div
                key={farm.id}
                style={{
                  background: isSelected
                    ? (isLight ? '#f0fdf4' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.9) 100%)')
                    : (isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.75)'),
                  border: isSelected
                    ? (isLight ? '2px solid #059669' : '2px solid #10b981')
                    : (isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)'),
                  borderRadius: '14px',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isLight
                    ? (isSelected ? '0 4px 15px rgba(16, 185, 129, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.04)')
                    : (isSelected ? '0 0 20px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : '0 8px 18px rgba(0, 0, 0, 0.4)'),
                  transition: 'all 0.25s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <h4 style={{ color: isLight ? '#0f172a' : '#ffffff', fontSize: '1.1rem', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
                      {farm.farm_name}
                    </h4>
                    <span
                      style={{
                        background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.2)',
                        border: isLight ? '1px solid #86efac' : '1px solid rgba(16, 185, 129, 0.4)',
                        color: isLight ? '#047857' : '#34d399',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                      }}
                    >
                      {farm.area_acres} Acres
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.88rem', color: isLight ? '#334155' : '#e2e8f0', marginBottom: '0.6rem' }}>
                    <strong style={{ color: isLight ? '#0f172a' : '#cbd5e1' }}>{farm.crop_type || 'General Crop'}</strong>
                  </div>

                  <div style={{
                    fontSize: '0.78rem',
                    color: isLight ? '#475569' : '#94a3b8',
                    lineHeight: '1.5',
                    background: isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.25)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div>Center: {farm.center_lat}°, {farm.center_lon}°</div>
                    <div>Geometry Area: {Math.round(farm.area_sq_m || 0).toLocaleString()} m²</div>
                  </div>
                </div>

                <div style={{ marginTop: '1.15rem', display: 'flex', gap: '0.6rem' }}>
                  <button
                    onClick={() => onSelectFarm(farm)}
                    className="btn-primary"
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      fontSize: '0.88rem',
                      fontWeight: '800',
                      justifyContent: 'center',
                    }}
                  >
                    Inspect & Analyze
                  </button>
                  <button
                    onClick={() => onDeleteFarm(farm.id, farm.farm_name)}
                    style={{
                      background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
                      border: isLight ? '1px solid #fca5a5' : '1px solid rgba(239, 68, 68, 0.35)',
                      color: isLight ? '#b91c1c' : '#f87171',
                      borderRadius: '10px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title="Delete this saved plot"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
