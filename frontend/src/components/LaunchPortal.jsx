import React from 'react';

export default function LaunchPortal({
  onSelectGuest,
  onOpenFarmerLogin,
  onOpenFarmerRegister,
  onQuickDemo
}) {
  return (
    <div className="launch-portal-wrapper">
      {/* Ambient Aurora Glow Orbs */}
      <div className="aurora-glow-orb orb-1"></div>
      <div className="aurora-glow-orb orb-2"></div>
      <div className="aurora-glow-orb orb-3"></div>

      <div className="launch-container">
        {/* HERO BRAND HEADER */}
        <div className="launch-hero">
          <div className="launch-badge">
            <span className="launch-badge-dot"></span>
            <span>SATELLITE CROP INTELLIGENCE</span>
          </div>

          <h1 className="launch-title">
            SENTIFIELD <span className="title-gradient">AI</span>
          </h1>

          <p className="launch-subtitle">
            Autonomous Multispectral Remote Sensing, Neural Crop Health Diagnostics & Precision Decision Intelligence
          </p>

          <p className="launch-instruction">
            Select your access portal to begin satellite field analysis:
          </p>
        </div>

        {/* DUAL ACCESS GATEWAYS */}
        <div className="launch-cards-grid">
          {/* CARD 1: FARMER PORTAL */}
          <div className="launch-card farmer-gateway-card">
            <div className="launch-card-header">
              <div className="gateway-icon farmer-icon" style={{ fontSize: "1.4rem", fontWeight: "900" }}>FARM</div>
              <span className="gateway-badge farmer-badge">REGISTERED PROFILES</span>
            </div>

            <h3 className="gateway-title">Farmer Portal</h3>
            <p className="gateway-desc">
              Designed for farm owners and agricultural managers. Store multiple farm boundaries permanently, track 30-day vegetation trajectories, and access personalized 14-day recovery recommendations.
            </p>

            <ul className="gateway-features">
              <li>
                <span className="feature-check">•</span>
                <span><strong>Multi-Farm Storage:</strong> Draw once, save forever in SQLite</span>
              </li>
              <li>
                <span className="feature-check">•</span>
                <span><strong>30-Day Pass History:</strong> Deduplicated 5-day revisit timeline</span>
              </li>
              <li>
                <span className="feature-check">•</span>
                <span><strong>Neural Agronomic Engine:</strong> Custom NPK & irrigation advisory</span>
              </li>
              <li>
                <span className="feature-check">•</span>
                <span><strong>1-Click Diagnostics:</strong> Re-analyze any plot instantly</span>
              </li>
            </ul>

            <div className="gateway-actions">
              <button
                onClick={onOpenFarmerLogin}
                className="btn-launch-primary"
              >
                <span>Farmer Sign In</span>
              </button>

              <button
                onClick={onOpenFarmerRegister}
                className="btn-launch-secondary"
              >
                <span>Register New Farm</span>
              </button>
            </div>

            <div className="demo-hint-box">
              <span>Quick Demo Access:</span>
              <button
                onClick={onQuickDemo}
                className="btn-demo-quick"
              >
                Launch Demo Farmer
              </button>
            </div>
          </div>

          {/* CARD 2: GUEST AGRONOMIST SANDBOX */}
          <div className="launch-card guest-gateway-card">
            <div className="launch-card-header">
              <div className="gateway-icon guest-icon" style={{ fontSize: "1.4rem", fontWeight: "900" }}>MAP</div>
              <span className="gateway-badge guest-badge">INSTANT ACCESS</span>
            </div>

            <h3 className="gateway-title">Guest Mode</h3>
            <p className="gateway-desc">
              Direct access for agricultural researchers, students, and evaluators. Immediately inspect any farmland coordinate worldwide with real-time satellite imagery—no sign-up required.
            </p>

            <ul className="gateway-features">
              <li>
                <span className="feature-check">•</span>
                <span><strong>Zero Registration:</strong> Jump straight into satellite analysis</span>
              </li>
              <li>
                <span className="feature-check">•</span>
                <span><strong>Interactive Boundary Drawing:</strong> Trace any farm polygon</span>
              </li>
              <li>
                <span className="feature-check">•</span>
                <span><strong>Canopy Stress Heatmap:</strong> Calibrated vegetative health breakdown</span>
              </li>
              <li>
                <span className="feature-check">•</span>
                <span><strong>Official PDF Export:</strong> Download comprehensive farm audit report</span>
              </li>
            </ul>

            <div className="gateway-actions">
              <button
                onClick={onSelectGuest}
                className="btn-launch-guest"
              >
                <span>Enter Guest Mode →</span>
              </button>
            </div>

            <div className="guest-note-box">
              <span>You can switch to a registered Farmer account anytime from the dashboard.</span>
            </div>
          </div>
        </div>

        {/* BOTTOM CAPABILITIES BAR */}
        <div className="launch-telemetry-strip">
          <div className="telemetry-item">
            <span className="telemetry-dot"></span>
            <span>Multispectral Ingestion Pipeline Active</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-dot"></span>
            <span>Comparative ML Ensemble (XGBoost, RF, MLP)</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-dot"></span>
            <span>Embedded SQLite Plot Persistence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
