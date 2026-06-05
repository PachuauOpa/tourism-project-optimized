import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import './HotelDetailPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Photo { id: string; url: string; caption?: string; }

interface HotelDetail {
  id: number;
  property_name: string;
  property_type: string;
  tagline: string | null;
  description: string | null;
  district: string | null;
  full_address: string | null;
  price_per_night: number | null;
  amenities: string[];
  cover_photo_url: string | null;
  photos: Photo[];
  rating: number;
  review_count: number;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
  owner_name: string;
}

const AMENITY_META: Record<string, { emoji: string; label: string }> = {
  wifi: { emoji: '📶', label: 'Free WiFi' },
  parking: { emoji: '🅿️', label: 'Parking' },
  food: { emoji: '🍽️', label: 'Restaurant' },
  ac: { emoji: '❄️', label: 'Air Conditioning' },
  pool: { emoji: '🏊', label: 'Swimming Pool' },
  gym: { emoji: '🏋️', label: 'Fitness Center' },
  spa: { emoji: '💆', label: 'Spa & Wellness' },
  laundry: { emoji: '🫧', label: 'Laundry' },
  garden: { emoji: '🌿', label: 'Garden' },
  bar: { emoji: '🍸', label: 'Bar & Lounge' },
  tv: { emoji: '📺', label: 'Smart TV' },
  heater: { emoji: '🔥', label: 'Room Heater' },
};

const HotelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const fetchHotel = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/hotels/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setHotel(data.hotel);
    } catch {
      setError('This property could not be found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchHotel(); }, [fetchHotel]);

  const allPhotos: Photo[] = hotel
    ? [
        ...(hotel.cover_photo_url ? [{ id: 'cover', url: hotel.cover_photo_url }] : []),
        ...(Array.isArray(hotel.photos) ? hotel.photos : [])
          .filter(p => p.url && p.url !== hotel.cover_photo_url),
      ]
    : [];

  const openLightbox = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const prevPhoto = () => setLightboxIdx(i => (i - 1 + allPhotos.length) % allPhotos.length);
  const nextPhoto = () => setLightboxIdx(i => (i + 1) % allPhotos.length);

  const handleCall = () => {
    if (hotel?.contact_phone) window.open(`tel:${hotel.contact_phone}`, '_self');
  };

  const handleReserve = () => {
    if (hotel?.contact_phone) window.open(`tel:${hotel.contact_phone}`, '_self');
    else if (hotel?.contact_email) window.open(`mailto:${hotel.contact_email}`, '_self');
  };

  if (loading) {
    return (
      <Screen className="hotel-detail-page">
        <div className="hd-loading-wrap">
          <div className="hd-spinner" />
          <p style={{ color: '#6b7a90', fontSize: 14 }}>Loading property details…</p>
        </div>
      </Screen>
    );
  }

  if (error || !hotel) {
    return (
      <Screen className="hotel-detail-page">
        <div className="hd-error-wrap">
          <div className="hd-error-icon">🏚️</div>
          <p className="hd-error-title">Property Not Found</p>
          <p className="hd-error-sub">{error || 'This listing is unavailable.'}</p>
          <button className="hd-back-link" onClick={() => navigate('/service/hotel-stays')}>
            Browse All Hotels
          </button>
        </div>
      </Screen>
    );
  }

  const displayPhoto = allPhotos[activePhotoIdx]?.url || null;
  const shortDesc = hotel.description && hotel.description.length > 200
    ? hotel.description.slice(0, 200) + '…'
    : hotel.description;
  const amenities = hotel.amenities || [];

  return (
    <Screen className="hotel-detail-page">
      {/* Hero */}
      <div className="hd-hero">
        {displayPhoto ? (
          <img className="hd-hero-img" src={displayPhoto} alt={hotel.property_name} />
        ) : (
          <div className="hd-hero-placeholder">🏨</div>
        )}
        <div className="hd-hero-overlay" />

        <div className="hd-hero-controls">
          <button className="hd-hero-btn" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            className={`hd-hero-btn hd-fav-btn ${isFav ? 'active' : ''}`}
            onClick={() => setIsFav(v => !v)}
            aria-label="Favorite"
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>

        <div className="hd-region-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {hotel.district || 'Mizoram'}
        </div>
      </div>

      {/* Photo Gallery Strip */}
      {allPhotos.length > 1 && (
        <div className="hd-gallery-section">
          <div className="hd-gallery-strip">
            {allPhotos.map((photo, idx) => (
              <div
                key={photo.id || idx}
                className={`hd-gallery-thumb ${activePhotoIdx === idx ? 'active-thumb' : ''}`}
                onClick={() => { setActivePhotoIdx(idx); }}
                onDoubleClick={() => openLightbox(idx)}
                role="button"
                tabIndex={0}
                aria-label={`Photo ${idx + 1}`}
              >
                <img src={photo.url} alt={photo.caption || `Photo ${idx + 1}`} />
              </div>
            ))}
            {allPhotos.length > 0 && (
              <div className="hd-gallery-more" onClick={() => openLightbox(0)} role="button" tabIndex={0}>
                <span style={{ fontSize: 20 }}>🔍</span>
                <span>View all</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="hd-content">

        {/* Identity Card */}
        <div className="hd-identity">
          <div className="hd-type-badge">
            {hotel.property_type === 'homestay' ? '🏡' : hotel.property_type === 'resort' ? '🌴' : '🏨'}&nbsp;
            {hotel.property_type}
          </div>
          <h1 className="hd-property-name">{hotel.property_name}</h1>
          {hotel.tagline && (
            <p style={{ fontSize: 13, color: '#6b7a90', margin: '0 0 8px', fontStyle: 'italic' }}>
              "{hotel.tagline}"
            </p>
          )}
          <div className="hd-location-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {hotel.full_address || hotel.district || 'Location not specified'}
          </div>
          <div className="hd-rating-row">
            <div className="hd-stars">
              ⭐ {Number(hotel.rating) > 0 ? Number(hotel.rating).toFixed(1) : 'New'}
            </div>
            {hotel.review_count > 0 && (
              <span className="hd-review-count">({hotel.review_count} reviews)</span>
            )}
            {hotel.price_per_night && (
              <div className="hd-price-inline">
                ₹{hotel.price_per_night.toLocaleString()}
                <span>/night</span>
              </div>
            )}
          </div>
        </div>

        {/* Facilities */}
        {amenities.length > 0 && (
          <div className="hd-section">
            <div className="hd-section-header">
              <h2 className="hd-section-title">Facilities</h2>
              <span style={{ fontSize: 12, color: '#6b7a90' }}>{amenities.length} available</span>
            </div>
            <div className="hd-amenities-grid">
              {amenities.map(a => {
                const meta = AMENITY_META[a] || { emoji: '✓', label: a };
                return (
                  <div key={a} className="hd-amenity-chip">
                    <span className="hd-amenity-chip-icon">{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {hotel.description && (
          <div className="hd-section">
            <div className="hd-section-header">
              <h2 className="hd-section-title">Description</h2>
            </div>
            <p className="hd-description-text">
              {descExpanded ? hotel.description : shortDesc}
            </p>
            {hotel.description.length > 200 && (
              <button className="hd-read-more-btn" onClick={() => setDescExpanded(v => !v)}>
                {descExpanded ? 'Show less ▲' : 'Read more… ▼'}
              </button>
            )}
          </div>
        )}

        {/* Gallery Photos (thumbnails) */}
        {allPhotos.length > 1 && (
          <div className="hd-section">
            <div className="hd-section-header">
              <h2 className="hd-section-title">Photos</h2>
              <button className="hd-see-all" onClick={() => openLightbox(0)}>See all</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {allPhotos.slice(0, 6).map((photo, idx) => (
                <div
                  key={photo.id || idx}
                  style={{ borderRadius: 12, overflow: 'hidden', height: 80, cursor: 'pointer', position: 'relative' }}
                  onClick={() => openLightbox(idx)}
                  role="button"
                  tabIndex={0}
                >
                  <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {idx === 5 && allPhotos.length > 6 && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(10,22,40,0.65)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 14, borderRadius: 12
                    }}>
                      +{allPhotos.length - 6}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="hd-section">
          <div className="hd-section-header">
            <h2 className="hd-section-title">Contact</h2>
          </div>
          <ul className="hd-contact-list">
            {hotel.contact_phone && (
              <li className="hd-contact-item">
                <div className="hd-contact-icon">📞</div>
                <div>
                  <p className="hd-contact-label">Phone</p>
                  <p className="hd-contact-value">
                    <a href={`tel:${hotel.contact_phone}`}>{hotel.contact_phone}</a>
                  </p>
                </div>
              </li>
            )}
            {hotel.contact_email && (
              <li className="hd-contact-item">
                <div className="hd-contact-icon">✉️</div>
                <div>
                  <p className="hd-contact-label">Email</p>
                  <p className="hd-contact-value">
                    <a href={`mailto:${hotel.contact_email}`}>{hotel.contact_email}</a>
                  </p>
                </div>
              </li>
            )}
            {hotel.website_url && (
              <li className="hd-contact-item">
                <div className="hd-contact-icon">🌐</div>
                <div>
                  <p className="hd-contact-label">Website</p>
                  <p className="hd-contact-value">
                    <a href={hotel.website_url} target="_blank" rel="noreferrer">{hotel.website_url}</a>
                  </p>
                </div>
              </li>
            )}
            {hotel.latitude && hotel.longitude && (
              <li className="hd-contact-item">
                <div className="hd-contact-icon">📍</div>
                <div>
                  <p className="hd-contact-label">Location</p>
                  <p className="hd-contact-value">
                    <a
                      href={`https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps
                    </a>
                  </p>
                </div>
              </li>
            )}
            <li className="hd-contact-item">
              <div className="hd-contact-icon">🏷️</div>
              <div>
                <p className="hd-contact-label">Managed by</p>
                <p className="hd-contact-value">{hotel.owner_name}</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Spacer for sticky bar */}
        <div style={{ height: 24 }} />
      </div>

      {/* Sticky Bottom Bar */}
      <div className="hd-sticky-bar">
        <div className="hd-sticky-price">
          <p className="hd-sticky-price-label">Total Cost</p>
          {hotel.price_per_night ? (
            <p className="hd-sticky-price-value">
              ₹{hotel.price_per_night.toLocaleString()}
              <span className="hd-sticky-price-unit"> / night</span>
            </p>
          ) : (
            <p className="hd-sticky-price-value" style={{ fontSize: 14, fontWeight: 600, color: '#6b7a90' }}>Contact for price</p>
          )}
        </div>
        {hotel.contact_phone && (
          <button className="hd-call-btn" onClick={handleCall} aria-label="Call">📞</button>
        )}
        <button className="hd-reserve-btn" onClick={handleReserve} id="hotel-reserve-btn">
          Reserve Your Spot →
        </button>
      </div>

      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <div className="hd-lightbox" onClick={closeLightbox}>
          <button className="hd-lightbox-close" onClick={closeLightbox}>✕</button>
          {allPhotos.length > 1 && (
            <>
              <button className="hd-lightbox-nav prev" onClick={e => { e.stopPropagation(); prevPhoto(); }}>‹</button>
              <button className="hd-lightbox-nav next" onClick={e => { e.stopPropagation(); nextPhoto(); }}>›</button>
            </>
          )}
          <img
            className="hd-lightbox-img"
            src={allPhotos[lightboxIdx]?.url}
            alt={`Photo ${lightboxIdx + 1}`}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </Screen>
  );
};

export default HotelDetailPage;
