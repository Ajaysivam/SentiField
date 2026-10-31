import React, { useState, useEffect } from 'react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = tab === 'login'
      ? { username: username.trim(), password }
      : { username: username.trim(), password, phone_number: phoneNumber.trim() || null };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Store in localStorage
      localStorage.setItem('farmer_token', data.token);
      localStorage.setItem('farmer_user', JSON.stringify(data.user));

      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('demo_farmer');
    setPassword('farm123');
    setTab('login');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="farm-card"
        style={{
          maxWidth: '440px',
          width: '100%',
          background: '#0f172a',
          borderColor: '#10b981',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(16, 185, 129, 0.2)',
          padding: '2rem',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '1.5rem',
            cursor: 'pointer',
          }}
          title="Close"
        >
          ✕
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>👨‍🌾</div>
          <h2 style={{ color: '#ffffff', fontSize: '1.35rem', fontWeight: '800' }}>
            Farmer Portal
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Save multiple farm plots & run autonomous crop health diagnostics with 1-click.
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '8px',
            padding: '0.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.9rem',
              background: tab === 'login' ? '#10b981' : 'transparent',
              color: tab === 'login' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.9rem',
              background: tab === 'register' ? '#10b981' : 'transparent',
              color: tab === 'register' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            Register New Farmer
          </button>
        </div>

        {error && (
          <div
            className="alert-warning"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '0.88rem',
              marginBottom: '1rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: '600' }}>
              Farmer Name / Username:
            </label>
            <input
              type="text"
              required
              className="input-search"
              placeholder="e.g. Ramesh_Farmer"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {tab === 'register' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: '600' }}>
                Phone Number (Optional):
              </label>
              <input
                type="tel"
                className="input-search"
                placeholder="e.g. 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: '600' }}>
              Password:
            </label>
            <input
              type="password"
              required
              className="input-search"
              placeholder="Enter secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}
          >
            {loading ? 'Authenticating...' : tab === 'login' ? '🌾 Log In to My Farms' : '✅ Create Farmer Profile'}
          </button>
        </form>

        {tab === 'login' && (
          <div style={{ marginTop: '1.25rem', textAlign: 'center', borderTop: '1px solid rgba(148, 163, 184, 0.15)', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={handleFillDemo}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px dashed #10b981',
                color: '#34d399',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              ⚡ Quick Fill Demo: demo_farmer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
