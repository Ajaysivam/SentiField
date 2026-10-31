import React from 'react';

const CROP_ICONS = {
  'Paddy / Rice': '🌾',
  'Cotton': '🌿',
  'Sugarcane': '🎋',
  'Maize / Corn': '🌽',
  'Wheat': '🌾',
  'Vegetables': '🥦',
  'Vegetables / Tomato': '🍅',
  'Coconut / Orchard': '🌴',
  'Coconut': '🥥',
  'Banana': '🍌',
  'General Crop': '🌱',
};

export default function SavedFarmsList({
  farms = [],
  loading = false,
  onSelectFarm,
  onDeleteFarm,
  activeFarmId = null,
  onClose,
}) {
  return (
    <section className="farm-card" style={{ borderColor: 'rgba(52, 211, 153, 0.4)', background: 'rgba(11, 18, 33, 0.92)', marginBottom: '1.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            🚜
          </div>
          <div>
            <h3 style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              Farmer Registered Plots <span style={{ color: '#34d399', fontSize: '1rem', fontWeight: '700' }}>({farms.length})</span>
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
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
            ✕ Close Drawer
          </button>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
          ⏳ Loading your registered farm plots...
        </div>
      )}

      {!loading && farms.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem 1.5rem',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '14px',
          border: '1px dashed rgba(255, 255, 255, 0.15)'
        }}>
          <p style={{ color: '#cbd5e1', fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>
            🌾 No farm plots saved yet in this profile
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.4rem', maxWidth: '450px', margin: '0.4rem auto 0 auto' }}>
            Draw a boundary polygon around any field on the map below, then click <strong>"💾 Save Farm"</strong> to store it permanently.
          </p>
        </div>
      )}

      {!loading && farms.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.15rem' }}>
          {farms.map((farm) => {
            const isSelected = activeFarmId === farm.id;
            const icon = CROP_ICONS[farm.crop_type] || '🌱';

            return (
              <div
                key={farm.id}
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.9) 100%)'
                    : 'rgba(15, 23, 42, 0.75)',
                  border: isSelected ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : '0 8px 18px rgba(0, 0, 0, 0.4)',
                  transition: 'all 0.25s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <h4 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
                      {farm.farm_name}
                    </h4>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#34d399',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                      }}
                    >
                      {farm.area_acres} Acres
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.88rem', color: '#e2e8f0', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                    <strong style={{ color: '#cbd5e1' }}>{farm.crop_type || 'General Crop'}</strong>
                  </div>

                  <div style={{
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    lineHeight: '1.5',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <div>📍 Center: {farm.center_lat}°, {farm.center_lon}°</div>
                    <div>📐 Geometry Area: {Math.round(farm.area_sq_m || 0).toLocaleString()} m²</div>
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
                    ⚡ Inspect & Analyze
                  </button>
                  <button
                    onClick={() => onDeleteFarm(farm.id, farm.farm_name)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#f87171',
                      borderRadius: '10px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title="Delete this saved plot"
                  >
                    🗑️
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
