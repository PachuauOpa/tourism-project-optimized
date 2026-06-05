import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import './HotelDashboardPage.css';

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

const DISTRICTS = [
  'Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip',
  'Mamit', 'Lawngtlai', 'Siaha', 'Saitual', 'Khawzawl', 'Hnahthial'
];

interface Owner { id: number; full_name: string; email: string; phone: string; }
interface Photo { id: string; url: string; caption?: string; storagePath?: string; }

interface Listing {
  id: number;
  property_name: string;
  property_type: string;
  tagline: string;
  description: string;
  district: string;
  full_address: string;
  price_per_night: number | null;
  contact_phone: string;
  contact_email: string;
  website_url: string;
  amenities: string[];
  cover_photo_url: string | null;
  photos: Photo[];
  rating: number;
  review_count: number;
  is_published: boolean;
}

type Tab = 'overview' | 'edit' | 'photos' | 'amenities';

const HotelDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Edit form state (synced with listing)
  const [editForm, setEditForm] = useState<Partial<Listing>>({});
  const [savingInfo, setSavingInfo] = useState(false);
  const [saveAlert, setSaveAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Photo state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoAlert, setPhotoAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Amenity state
  const [amenities, setAmenities] = useState<string[]>([]);
  const [savingAmenities, setSavingAmenities] = useState(false);

  const token = sessionStorage.getItem('hotel_token') || '';

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  // Load profile on mount
  const loadProfile = useCallback(async () => {
    if (!token) { navigate('/service/hotels/login'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/hotels/me`, { headers: authHeaders() });
      if (res.status === 401) { navigate('/service/hotels/login'); return; }
      const data = await res.json();
      setOwner(data.owner);
      if (data.listing) {
        setListing(data.listing);
        setEditForm(data.listing);
        setAmenities(data.listing.amenities || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, navigate, authHeaders]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Sync edit form when listing changes
  useEffect(() => {
    if (listing) { setEditForm(listing); setAmenities(listing.amenities || []); }
  }, [listing]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/hotels/logout`, { method: 'POST', headers: authHeaders() });
    } finally {
      sessionStorage.removeItem('hotel_token');
      sessionStorage.removeItem('hotel_owner');
      sessionStorage.removeItem('hotel_listing_id');
      navigate('/service/hotels/login');
    }
  };

  const handleSaveInfo = async () => {
    if (!listing) return;
    setSavingInfo(true);
    setSaveAlert(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/hotels/${listing.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          property_name: editForm.property_name,
          property_type: editForm.property_type,
          tagline: editForm.tagline,
          description: editForm.description,
          district: editForm.district,
          full_address: editForm.full_address,
          price_per_night: editForm.price_per_night,
          contact_phone: editForm.contact_phone,
          contact_email: editForm.contact_email,
          website_url: editForm.website_url,
          is_published: editForm.is_published,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      setListing(data.listing);
      setSaveAlert({ type: 'success', msg: '✅ Property info saved successfully!' });
    } catch (err: any) {
      setSaveAlert({ type: 'error', msg: `⚠️ ${err.message}` });
    } finally {
      setSavingInfo(false);
      setTimeout(() => setSaveAlert(null), 4000);
    }
  };

  const handleSaveAmenities = async () => {
    if (!listing) return;
    setSavingAmenities(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/hotels/${listing.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ amenities })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setListing(data.listing);
      setSaveAlert({ type: 'success', msg: '✅ Amenities updated!' });
      setActiveTab('overview');
    } catch (err: any) {
      setSaveAlert({ type: 'error', msg: `⚠️ ${err.message}` });
    } finally {
      setSavingAmenities(false);
      setTimeout(() => setSaveAlert(null), 3000);
    }
  };

  const toggleAmenity = (key: string) => {
    setAmenities(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !listing) return;
    if (file.size > 5 * 1024 * 1024) { setPhotoAlert({ type: 'error', msg: 'Image must be under 5MB' }); return; }

    setUploadingPhoto(true);
    setPhotoAlert(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`${API_BASE_URL}/api/hotels/${listing.id}/photos`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ base64, mimeType: file.type, caption: file.name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      // Refresh listing
      await loadProfile();
      setPhotoAlert({ type: 'success', msg: '📸 Photo uploaded!' });
    } catch (err: any) {
      setPhotoAlert({ type: 'error', msg: `⚠️ ${err.message}` });
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setPhotoAlert(null), 4000);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!listing || !window.confirm('Delete this photo?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/hotels/${listing.id}/photos/${photoId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Delete failed');
      await loadProfile();
      setPhotoAlert({ type: 'success', msg: '🗑️ Photo removed' });
    } catch (err: any) {
      setPhotoAlert({ type: 'error', msg: `⚠️ ${err.message}` });
    } finally {
      setTimeout(() => setPhotoAlert(null), 3000);
    }
  };

  const handleSetCover = async (photoId: string) => {
    if (!listing) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/hotels/${listing.id}/cover`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ photoId })
      });
      if (!res.ok) throw new Error('Failed');
      await loadProfile();
      setPhotoAlert({ type: 'success', msg: '🖼️ Cover photo updated!' });
    } catch {
      setPhotoAlert({ type: 'error', msg: '⚠️ Could not set cover photo' });
    } finally {
      setTimeout(() => setPhotoAlert(null), 3000);
    }
  };

  // Loading / Auth guard
  if (loading) {
    return (
      <Screen className="hotel-dashboard-page">
        <div className="hdb-guard-wrap">
          <div className="hdb-spinner" />
          <p style={{ color: '#6b7a90', fontSize: 14 }}>Loading your dashboard…</p>
        </div>
      </Screen>
    );
  }

  if (!owner || !listing) {
    return (
      <Screen className="hotel-dashboard-page">
        <div className="hdb-guard-wrap">
          <span style={{ fontSize: 52 }}>🔒</span>
          <p style={{ fontSize: 18, fontWeight: 700 }}>Access Restricted</p>
          <p style={{ color: '#6b7a90', fontSize: 14 }}>Please log in to your owner account</p>
          <button className="hdb-save-btn" style={{ marginTop: 8 }} onClick={() => navigate('/service/hotels/login')}>
            Go to Login
          </button>
        </div>
      </Screen>
    );
  }

  const photos: Photo[] = Array.isArray(listing.photos) ? listing.photos : [];
  const allPhotos: Photo[] = [
    ...(listing.cover_photo_url ? [{ id: 'cover', url: listing.cover_photo_url }] : []),
    ...photos.filter(p => p.url !== listing.cover_photo_url)
  ];

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '🏠' },
    { key: 'edit', label: 'Edit Info', icon: '✏️' },
    { key: 'photos', label: 'Photos', icon: '📸' },
    { key: 'amenities', label: 'Amenities', icon: '✨' },
  ];

  return (
    <Screen className="hotel-dashboard-page">
      {/* Header */}
      <div className="hdb-header">
        <div className="hdb-header-top">
          <div className="hdb-header-identity">
            <p className="hdb-welcome">Owner Dashboard</p>
            <h1 className="hdb-owner-name">Hello, {owner.full_name.split(' ')[0]}! 👋</h1>
            <p className="hdb-property-name">
              🏨 {listing.property_name}
              &nbsp;
              <span className={`hdb-published-badge ${listing.is_published ? 'live' : 'draft'}`}>
                {listing.is_published ? '● Live' : '○ Draft'}
              </span>
            </p>
          </div>
          <div className="hdb-header-actions">
            <button className="hdb-logout-btn" onClick={handleLogout} id="dashboard-logout">Logout</button>
            <Link to={`/service/hotel-stays/${listing.id}`} className="hdb-preview-btn" id="dashboard-preview">
              👁️ Preview
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="hdb-stats-row">
        <div className="hdb-stat-card">
          <p className="hdb-stat-value teal">{photos.length}</p>
          <p className="hdb-stat-label">Photos</p>
        </div>
        <div className="hdb-stat-card">
          <p className="hdb-stat-value amber">
            {listing.rating > 0 ? Number(listing.rating).toFixed(1) : '—'}
          </p>
          <p className="hdb-stat-label">Rating</p>
        </div>
        <div className="hdb-stat-card">
          <p className="hdb-stat-value">{listing.amenities?.length || 0}</p>
          <p className="hdb-stat-label">Amenities</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="hdb-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            id={`dashboard-tab-${tab.key}`}
            className={`hdb-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="hdb-panel">
          {saveAlert && <div className={`hdb-alert ${saveAlert.type}`}>{saveAlert.msg}</div>}

          {/* Cover photo preview */}
          <div className="hdb-overview-cover">
            {listing.cover_photo_url ? (
              <img src={listing.cover_photo_url} alt="Cover" />
            ) : (
              <div className="hdb-overview-cover-placeholder">
                <span>🏨</span>
                <span>No cover photo yet</span>
              </div>
            )}
            <span className="hdb-overview-cover-hint">Tap Photos tab to manage</span>
          </div>

          {/* Key info */}
          <div className="hdb-info-card">
            <p className="hdb-info-card-title">Property Details</p>
            <div className="hdb-info-row">
              <span className="hdb-info-icon">🏷️</span>
              <div>
                <p className="hdb-info-label">Type</p>
                <p className="hdb-info-val" style={{ textTransform: 'capitalize' }}>{listing.property_type}</p>
              </div>
            </div>
            <div className="hdb-info-row">
              <span className="hdb-info-icon">📍</span>
              <div>
                <p className="hdb-info-label">Location</p>
                <p className="hdb-info-val">{listing.district || 'Not set'}{listing.full_address ? `, ${listing.full_address}` : ''}</p>
              </div>
            </div>
            {listing.price_per_night && (
              <div className="hdb-info-row">
                <span className="hdb-info-icon">💰</span>
                <div>
                  <p className="hdb-info-label">Price per Night</p>
                  <p className="hdb-info-val">₹{listing.price_per_night.toLocaleString()}</p>
                </div>
              </div>
            )}
            {listing.contact_phone && (
              <div className="hdb-info-row">
                <span className="hdb-info-icon">📞</span>
                <div>
                  <p className="hdb-info-label">Contact Phone</p>
                  <p className="hdb-info-val">{listing.contact_phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="hdb-save-btn" style={{ flex: 1, minWidth: 140 }} onClick={() => setActiveTab('edit')}>
              ✏️ Edit Info
            </button>
            <button className="hdb-save-btn" style={{ flex: 1, minWidth: 140, background: '#112040', color: '#fff' }}
              onClick={() => setActiveTab('photos')}>
              📸 Manage Photos
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Info Tab ── */}
      {activeTab === 'edit' && (
        <div className="hdb-panel">
          {saveAlert && <div className={`hdb-alert ${saveAlert.type}`}>{saveAlert.msg}</div>}
          <div className="hdb-edit-form">
            <div className="hdb-field">
              <label className="hdb-label" htmlFor="edit-prop-name">Property Name</label>
              <input id="edit-prop-name" className="hdb-input" value={editForm.property_name || ''}
                onChange={e => setEditForm(f => ({ ...f, property_name: e.target.value }))} />
            </div>
            <div className="hdb-field">
              <label className="hdb-label" htmlFor="edit-tagline">Tagline</label>
              <input id="edit-tagline" className="hdb-input" placeholder="e.g. Cozy retreat in the hills"
                value={editForm.tagline || ''}
                onChange={e => setEditForm(f => ({ ...f, tagline: e.target.value }))} />
            </div>
            <div className="hdb-input-row">
              <div className="hdb-field">
                <label className="hdb-label" htmlFor="edit-type">Type</label>
                <select id="edit-type" className="hdb-select" value={editForm.property_type || 'hotel'}
                  onChange={e => setEditForm(f => ({ ...f, property_type: e.target.value }))}>
                  {['hotel', 'homestay', 'resort', 'guesthouse'].map(t =>
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  )}
                </select>
              </div>
              <div className="hdb-field">
                <label className="hdb-label" htmlFor="edit-district">District</label>
                <select id="edit-district" className="hdb-select" value={editForm.district || ''}
                  onChange={e => setEditForm(f => ({ ...f, district: e.target.value }))}>
                  <option value="">Select…</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="hdb-field">
              <label className="hdb-label" htmlFor="edit-address">Full Address</label>
              <input id="edit-address" className="hdb-input" placeholder="Street, locality"
                value={editForm.full_address || ''}
                onChange={e => setEditForm(f => ({ ...f, full_address: e.target.value }))} />
            </div>
            <div className="hdb-field">
              <label className="hdb-label" htmlFor="edit-desc">Description</label>
              <textarea id="edit-desc" className="hdb-textarea"
                placeholder="Tell travelers about your property…"
                value={editForm.description || ''}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="hdb-input-row">
              <div className="hdb-field">
                <label className="hdb-label" htmlFor="edit-price">Price / Night (₹)</label>
                <input id="edit-price" className="hdb-input" type="number" min="0"
                  value={editForm.price_per_night || ''}
                  onChange={e => setEditForm(f => ({ ...f, price_per_night: parseInt(e.target.value) || null }))} />
              </div>
              <div className="hdb-field">
                <label className="hdb-label" htmlFor="edit-published">Visibility</label>
                <select id="edit-published" className="hdb-select"
                  value={editForm.is_published ? 'true' : 'false'}
                  onChange={e => setEditForm(f => ({ ...f, is_published: e.target.value === 'true' }))}>
                  <option value="true">🟢 Live / Published</option>
                  <option value="false">⚪ Draft / Hidden</option>
                </select>
              </div>
            </div>
            <div className="hdb-field">
              <label className="hdb-label" htmlFor="edit-phone">Contact Phone</label>
              <input id="edit-phone" className="hdb-input" type="tel"
                value={editForm.contact_phone || ''}
                onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))} />
            </div>
            <div className="hdb-field">
              <label className="hdb-label" htmlFor="edit-email">Contact Email</label>
              <input id="edit-email" className="hdb-input" type="email"
                value={editForm.contact_email || ''}
                onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))} />
            </div>
            <div className="hdb-field">
              <label className="hdb-label" htmlFor="edit-website">Website URL</label>
              <input id="edit-website" className="hdb-input" type="url" placeholder="https://"
                value={editForm.website_url || ''}
                onChange={e => setEditForm(f => ({ ...f, website_url: e.target.value }))} />
            </div>
            <button
              className="hdb-save-btn"
              id="dashboard-save-info"
              onClick={handleSaveInfo}
              disabled={savingInfo}
            >
              {savingInfo ? '⏳ Saving…' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Photos Tab ── */}
      {activeTab === 'photos' && (
        <div className="hdb-panel">
          {photoAlert && <div className={`hdb-alert ${photoAlert.type}`}>{photoAlert.msg}</div>}
          <p style={{ fontSize: 13, color: '#6b7a90', margin: '0 0 16px' }}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded. The first photo becomes your cover image. Hover to delete or set as cover.
          </p>
          <div className="hdb-photo-grid">
            {/* Upload zone */}
            <label className="hdb-upload-zone" htmlFor="photo-upload-input">
              <input
                id="photo-upload-input"
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
              />
              {uploadingPhoto ? (
                <div className="hdb-uploading-overlay">
                  <div className="hdb-uploading-spinner" />
                </div>
              ) : (
                <>
                  <span className="hdb-upload-icon">📷</span>
                  <span className="hdb-upload-label">Add Photo</span>
                </>
              )}
            </label>

            {/* Photo items */}
            {allPhotos.map((photo, idx) => (
              <div key={photo.id || idx} className="hdb-photo-item">
                <img src={photo.url} alt={photo.caption || `Photo ${idx + 1}`} loading="lazy" />
                {photo.url === listing.cover_photo_url && (
                  <span className="hdb-cover-label">Cover</span>
                )}
                <div className="hdb-photo-actions">
                  {photo.url !== listing.cover_photo_url && photo.id !== 'cover' && (
                    <button
                      className="hdb-photo-action-btn cover"
                      onClick={() => handleSetCover(photo.id)}
                      title="Set as cover"
                    >⭐</button>
                  )}
                  {photo.id !== 'cover' && (
                    <button
                      className="hdb-photo-action-btn delete"
                      onClick={() => handleDeletePhoto(photo.id)}
                      title="Delete photo"
                    >🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Amenities Tab ── */}
      {activeTab === 'amenities' && (
        <div className="hdb-panel">
          <p style={{ fontSize: 13, color: '#6b7a90', margin: '0 0 16px' }}>
            Select all amenities available at your property. These appear as facility badges on your listing page.
          </p>
          <div className="hdb-amenity-grid">
            {AMENITY_OPTIONS.map(a => (
              <label
                key={a.key}
                className={`hdb-amenity-check ${amenities.includes(a.key) ? 'checked' : ''}`}
                id={`amenity-check-${a.key}`}
              >
                <input type="checkbox" checked={amenities.includes(a.key)} onChange={() => toggleAmenity(a.key)} />
                <span className="hdb-amenity-icon">{a.emoji}</span>
                <span className="hdb-amenity-label">{a.label}</span>
              </label>
            ))}
          </div>
          <button
            className="hdb-save-btn"
            id="dashboard-save-amenities"
            onClick={handleSaveAmenities}
            disabled={savingAmenities}
          >
            {savingAmenities ? '⏳ Saving…' : '💾 Save Amenities'}
          </button>
        </div>
      )}
    </Screen>
  );
};

export default HotelDashboardPage;
