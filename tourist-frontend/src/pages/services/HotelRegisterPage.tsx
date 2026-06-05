import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import './HotelAuthPages.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const AMENITY_OPTIONS = [
  { key: 'wifi', emoji: '📶', label: 'WiFi' },
  { key: 'parking', emoji: '🅿️', label: 'Parking' },
  { key: 'food', emoji: '🍽️', label: 'Restaurant' },
  { key: 'ac', emoji: '❄️', label: 'Air Conditioning' },
  { key: 'pool', emoji: '🏊', label: 'Swimming Pool' },
  { key: 'gym', emoji: '🏋️', label: 'Gym' },
  { key: 'spa', emoji: '💆', label: 'Spa' },
  { key: 'laundry', emoji: '🫧', label: 'Laundry' },
  { key: 'garden', emoji: '🌿', label: 'Garden' },
  { key: 'bar', emoji: '🍸', label: 'Bar & Lounge' },
  { key: 'tv', emoji: '📺', label: 'Smart TV' },
  { key: 'heater', emoji: '🔥', label: 'Room Heater' },
];

const PROPERTY_TYPES = ['hotel', 'homestay', 'resort', 'guesthouse'];

const DISTRICTS = [
  'Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip',
  'Mamit', 'Lawngtlai', 'Siaha', 'Saitual', 'Khawzawl', 'Hnahthial'
];

type Step = 1 | 2 | 3;

interface FormData {
  // Step 1 – Account
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  // Step 2 – Property
  property_name: string;
  property_type: string;
  district: string;
  full_address: string;
  description: string;
  tagline: string;
  // Step 3 – Amenities & Pricing
  amenities: string[];
  price_per_night: string;
  contact_phone: string;
  contact_email: string;
  website_url: string;
}

const HotelRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<FormData>({
    full_name: '', email: '', phone: '', password: '', confirmPassword: '',
    property_name: '', property_type: 'hotel', district: '', full_address: '',
    description: '', tagline: '',
    amenities: [], price_per_night: '', contact_phone: '', contact_email: '', website_url: ''
  });

  const update = (field: keyof FormData, value: string | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleAmenity = (key: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter(a => a !== key)
        : [...prev.amenities, key]
    }));
  };

  const validateStep1 = () => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (!form.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) return 'Valid email is required';
    if (!form.phone.trim() || form.phone.length < 8) return 'Valid phone number is required';
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return '';
  };

  const validateStep2 = () => {
    if (!form.property_name.trim()) return 'Property name is required';
    if (!form.property_type) return 'Property type is required';
    if (!form.district) return 'District is required';
    return '';
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/hotels/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          property_name: form.property_name.trim(),
          property_type: form.property_type,
          district: form.district,
          full_address: form.full_address.trim(),
          description: form.description.trim(),
          tagline: form.tagline.trim(),
          amenities: form.amenities,
          price_per_night: form.price_per_night ? parseInt(form.price_per_night) : null,
          contact_phone: form.contact_phone.trim() || form.phone.trim(),
          contact_email: form.contact_email.trim() || form.email.trim(),
          website_url: form.website_url.trim(),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ['Account', 'Property', 'Details'];

  if (success) {
    return (
      <Screen className="hotel-auth-page">
        <div className="ha-success-card" style={{ margin: '40px 20px' }}>
          <div className="ha-success-icon">🎉</div>
          <h2 className="ha-success-title">You're all set!</h2>
          <p className="ha-success-sub">
            Your property has been listed. Log in to your owner dashboard to add photos,
            update details, and manage your listing.
          </p>
          <button className="ha-btn-primary" style={{ width: '100%' }} onClick={() => navigate('/service/hotels/login')}>
            Go to Login →
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="hotel-auth-page">
      {/* Header */}
      <div className="ha-header">
        <div className="ha-header-top">
          <button className="ha-back-btn" onClick={() => step > 1 ? setStep(s => (s - 1) as Step) : navigate('/service/hotel-stays')} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <Link to="/service/hotels/login" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>
            Already have an account?
          </Link>
        </div>
        <span className="ha-header-icon">🏨</span>
        <h1 className="ha-header-title">List Your Property</h1>
        <p className="ha-header-subtitle">Step {step} of 3 — {STEPS[step - 1]}</p>
      </div>

      {/* Step Indicator */}
      <div className="ha-steps" style={{ padding: '24px 24px 32px', background: '#f5f7fb' }}>
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div className={`ha-step ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`} style={{ position: 'relative' }}>
              <div className="ha-step-circle">
                {step > i + 1 ? '✓' : i + 1}
              </div>
            </div>
            {i < STEPS.length - 1 && <div className={`ha-step-line ${step > i + 1 ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Account */}
      {step === 1 && (
        <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
          <div className="ha-form-card">
            <p className="ha-form-card-title">👤 Account Details</p>
            {error && <div className="ha-error-alert">⚠️ {error}</div>}
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-full-name">Full Name</label>
              <input id="reg-full-name" className="ha-input" type="text" placeholder="Your full name"
                value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
            </div>
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-email">Email Address</label>
              <input id="reg-email" className="ha-input" type="email" placeholder="you@email.com"
                value={form.email} onChange={e => update('email', e.target.value)} required />
            </div>
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-phone">Phone Number</label>
              <input id="reg-phone" className="ha-input" type="tel" placeholder="+91 98765 43210"
                value={form.phone} onChange={e => update('phone', e.target.value)} required />
            </div>
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-password">Password</label>
              <div className="ha-password-wrap">
                <input id="reg-password" className="ha-input" type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters" value={form.password}
                  onChange={e => update('password', e.target.value)} required style={{ paddingRight: 48 }} />
                <button type="button" className="ha-password-toggle" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-confirm">Confirm Password</label>
              <input id="reg-confirm" className="ha-input" type={showPassword ? 'text' : 'password'}
                placeholder="Repeat password" value={form.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)} required />
            </div>
          </div>
          <div className="ha-actions">
            <button type="submit" className="ha-btn-primary">Continue →</button>
          </div>
        </form>
      )}

      {/* Step 2: Property */}
      {step === 2 && (
        <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
          <div className="ha-form-card">
            <p className="ha-form-card-title">🏨 Property Details</p>
            {error && <div className="ha-error-alert">⚠️ {error}</div>}
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-prop-name">Property Name</label>
              <input id="reg-prop-name" className="ha-input" type="text" placeholder="e.g. Green Valley Homestay"
                value={form.property_name} onChange={e => update('property_name', e.target.value)} required />
            </div>
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-tagline">Tagline (optional)</label>
              <input id="reg-tagline" className="ha-input" type="text" placeholder="e.g. Cozy retreat in the hills"
                value={form.tagline} onChange={e => update('tagline', e.target.value)} />
            </div>
            <div className="ha-input-row ha-field">
              <div>
                <label className="ha-label" htmlFor="reg-type">Type</label>
                <select id="reg-type" className="ha-select" value={form.property_type}
                  onChange={e => update('property_type', e.target.value)}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="ha-label" htmlFor="reg-district">District</label>
                <select id="reg-district" className="ha-select" value={form.district}
                  onChange={e => update('district', e.target.value)} required>
                  <option value="">Select…</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-address">Full Address</label>
              <input id="reg-address" className="ha-input" type="text" placeholder="Street, locality, city"
                value={form.full_address} onChange={e => update('full_address', e.target.value)} />
            </div>
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-desc">Description</label>
              <textarea id="reg-desc" className="ha-textarea" placeholder="Tell travelers what makes your place special…"
                value={form.description} onChange={e => update('description', e.target.value)} />
            </div>
          </div>
          <div className="ha-actions">
            <button type="button" className="ha-btn-secondary" onClick={() => setStep(1)}>‹</button>
            <button type="submit" className="ha-btn-primary">Continue →</button>
          </div>
        </form>
      )}

      {/* Step 3: Amenities & Pricing */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <div className="ha-form-card">
            <p className="ha-form-card-title">⭐ Amenities & Pricing</p>
            {error && <div className="ha-error-alert">⚠️ {error}</div>}

            <label className="ha-label">Amenities Available</label>
            <div className="ha-amenity-grid" style={{ marginBottom: 20 }}>
              {AMENITY_OPTIONS.map(a => (
                <label key={a.key} className={`ha-amenity-check ${form.amenities.includes(a.key) ? 'checked' : ''}`}>
                  <input type="checkbox" checked={form.amenities.includes(a.key)} onChange={() => toggleAmenity(a.key)} />
                  <span className="ha-amenity-check-icon">{a.emoji}</span>
                  <span className="ha-amenity-check-label">{a.label}</span>
                </label>
              ))}
            </div>

            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-price">Price per Night (₹)</label>
              <input id="reg-price" className="ha-input" type="number" min="0" placeholder="e.g. 1500"
                value={form.price_per_night} onChange={e => update('price_per_night', e.target.value)} />
            </div>

            <div className="ha-divider" />
            <p className="ha-form-card-title" style={{ fontSize: 14 }}>📞 Contact Information</p>

            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-cphone">Contact Phone</label>
              <input id="reg-cphone" className="ha-input" type="tel" placeholder="Public phone number"
                value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} />
            </div>
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-cemail">Contact Email</label>
              <input id="reg-cemail" className="ha-input" type="email" placeholder="Public email"
                value={form.contact_email} onChange={e => update('contact_email', e.target.value)} />
            </div>
            <div className="ha-field">
              <label className="ha-label" htmlFor="reg-website">Website (optional)</label>
              <input id="reg-website" className="ha-input" type="url" placeholder="https://yourhotel.com"
                value={form.website_url} onChange={e => update('website_url', e.target.value)} />
            </div>
          </div>
          <div className="ha-actions">
            <button type="button" className="ha-btn-secondary" onClick={() => setStep(2)}>‹</button>
            <button type="submit" className="ha-btn-primary" disabled={loading} id="hotel-register-submit">
              {loading ? '⏳ Registering…' : '🏨 List My Property'}
            </button>
          </div>
        </form>
      )}

      <div className="ha-footer">
        Already listed? <Link to="/service/hotels/login">Sign in to your dashboard →</Link>
      </div>
    </Screen>
  );
};

export default HotelRegisterPage;
