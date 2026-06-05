import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import './HotelAuthPages.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const HotelLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/hotels/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      // Persist token + owner info in sessionStorage
      sessionStorage.setItem('hotel_token', data.token);
      sessionStorage.setItem('hotel_owner', JSON.stringify(data.owner));
      sessionStorage.setItem('hotel_listing_id', String(data.listing_id));

      navigate('/service/hotels/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen className="hotel-auth-page">
      {/* Header */}
      <div className="ha-header">
        <div className="ha-header-top">
          <button
            className="ha-back-btn"
            onClick={() => navigate('/service/hotel-stays')}
            aria-label="Back to hotels"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <Link to="/service/hotels/register" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>
            Register property
          </Link>
        </div>
        <span className="ha-header-icon">🔐</span>
        <h1 className="ha-header-title">Owner Login</h1>
        <p className="ha-header-subtitle">Sign in to manage your hotel or homestay</p>
      </div>

      {/* Login Card */}
      <form onSubmit={handleSubmit}>
        <div className="ha-login-card">
          {error && <div className="ha-error-alert">⚠️ {error}</div>}

          <div className="ha-field">
            <label className="ha-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              className="ha-input"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="ha-field">
            <label className="ha-label" htmlFor="login-password">Password</label>
            <div className="ha-password-wrap">
              <input
                id="login-password"
                className="ha-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                className="ha-password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Info box */}
          <div style={{
            background: 'rgba(0,201,167,0.08)',
            border: '1.5px solid rgba(0,201,167,0.25)',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
            color: '#009e84',
            marginTop: 4
          }}>
            🏨 Logging in will take you to your property dashboard where you can manage photos, pricing, and amenities.
          </div>
        </div>

        <div className="ha-actions">
          <button
            type="submit"
            className="ha-btn-primary"
            id="hotel-login-submit"
            disabled={loading}
          >
            {loading ? '⏳ Signing in…' : '🚀 Sign In to Dashboard'}
          </button>
        </div>
      </form>

      <div className="ha-footer">
        Don't have an account?{' '}
        <Link to="/service/hotels/register">List your property →</Link>
      </div>

      {/* Browse link */}
      <div className="ha-footer" style={{ marginTop: -8 }}>
        <Link to="/service/hotel-stays" style={{ color: '#6b7a90' }}>
          ← Browse all hotels
        </Link>
      </div>
    </Screen>
  );
};

export default HotelLoginPage;
