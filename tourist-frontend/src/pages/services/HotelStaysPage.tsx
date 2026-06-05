import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import './HotelStaysPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface HotelListing {
  id: number;
  property_name: string;
  property_type: string;
  tagline: string | null;
  description: string | null;
  district: string | null;
  price_per_night: number | null;
  amenities: string[];
  cover_photo_url: string | null;
  rating: number;
  review_count: number;
  contact_phone: string | null;
  owner_name: string;
}

const PROPERTY_TYPES = ['all', 'hotel', 'homestay', 'resort', 'guesthouse'];

const AMENITY_FILTERS = [
  { key: 'wifi', label: 'WiFi', emoji: '📶' },
  { key: 'parking', label: 'Parking', emoji: '🅿️' },
  { key: 'food', label: 'Food', emoji: '🍽️' },
  { key: 'ac', label: 'AC', emoji: '❄️' },
  { key: 'pool', label: 'Pool', emoji: '🏊' },
];

const AMENITY_EMOJI_MAP: Record<string, string> = {
  wifi: '📶', parking: '🅿️', food: '🍽️', ac: '❄️', pool: '🏊',
  gym: '🏋️', spa: '💆', laundry: '🫧', garden: '🌿', bar: '🍸',
};

const SkeletonCards: React.FC = () => (
  <div className="hotel-skeleton-grid">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="hotel-skeleton-card">
        <div className="hotel-skeleton-img" />
        <div className="hotel-skeleton-body">
          <div className="hotel-skeleton-line full" />
          <div className="hotel-skeleton-line short" />
          <div className="hotel-skeleton-line medium" />
        </div>
      </div>
    ))}
  </div>
);

const HotelStaysPage: React.FC = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<HotelListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [activeAmenity, setActiveAmenity] = useState('');
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / 12);

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (activeType !== 'all') params.set('type', activeType);
      if (activeAmenity) params.set('amenity', activeAmenity);
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetch(`${API_BASE_URL}/api/hotels?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setHotels(data.hotels || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeType, activeAmenity, page]);

  useEffect(() => { fetchHotels(); }, [fetchHotels]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
    setPage(1);
  };

  const toggleFavorite = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTypeSelect = (type: string) => {
    setActiveType(type);
    setPage(1);
  };

  const handleAmenitySelect = (key: string) => {
    setActiveAmenity(prev => prev === key ? '' : key);
    setPage(1);
  };

  return (
    <Screen className="hotel-page">
      {/* Hero */}
      <div className="hotel-hero">
        <div className="hotel-hero-top">
          <button className="hotel-back-btn" onClick={() => navigate('/home')} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <Link to="/service/hotels/login" className="hotel-owner-link">
            🏨 Owner Login
          </Link>
        </div>

        <div className="hotel-hero-headline">
          <p className="hotel-hero-tagline">🏡 Hotels & Homestays</p>
          <h1 className="hotel-hero-title">
            Find the <span>Perfect</span><br />Place to Stay
          </h1>
          <p className="hotel-hero-subtitle">
            Discover verified hotels and cozy homestays across the region
          </p>
        </div>

        {/* Search Bar */}
        <div className="hotel-search-wrap">
          <form className="hotel-search-bar" onSubmit={handleSearch}>
            <span className="hotel-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              id="hotel-search-input"
              className="hotel-search-input"
              type="text"
              placeholder="Search by name, district…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="hotel-search-btn">Search</button>
          </form>
        </div>
      </div>

      {/* Filters */}
      <div className="hotel-filters-section">
        <div className="hotel-type-chips">
          {PROPERTY_TYPES.map(type => (
            <button
              key={type}
              id={`hotel-type-${type}`}
              className={`hotel-type-chip ${activeType === type ? 'active' : ''}`}
              onClick={() => handleTypeSelect(type)}
            >
              {type === 'all' ? '✨ All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className="hotel-amenity-chips">
          {AMENITY_FILTERS.map(a => (
            <button
              key={a.key}
              id={`hotel-amenity-${a.key}`}
              className={`hotel-amenity-chip ${activeAmenity === a.key ? 'active' : ''}`}
              onClick={() => handleAmenitySelect(a.key)}
            >
              <span>{a.emoji}</span> {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="hotel-results-header">
        <p className="hotel-results-count">
          <span>{total}</span> {total === 1 ? 'property' : 'properties'} found
        </p>
      </div>

      {/* CTA Banner — list property */}
      <div className="hotel-cta-banner">
        <div className="hotel-cta-text">
          <h3>Own a hotel or homestay?</h3>
          <p>List your property and reach thousands of travelers</p>
        </div>
        <Link to="/service/hotels/register" className="hotel-cta-btn">
          List Property →
        </Link>
      </div>

      {/* Listings */}
      {loading ? (
        <SkeletonCards />
      ) : hotels.length === 0 ? (
        <div className="hotel-empty-state">
          <div className="hotel-empty-icon">🏨</div>
          <p className="hotel-empty-title">No properties found</p>
          <p className="hotel-empty-subtitle">
            {searchQuery || activeType !== 'all' || activeAmenity
              ? 'Try adjusting your search or filters'
              : 'Be the first to list a property!'}
          </p>
        </div>
      ) : (
        <>
          <div className="hotel-card-grid">
            {hotels.map(hotel => (
              <div
                key={hotel.id}
                className="hotel-card"
                id={`hotel-card-${hotel.id}`}
                onClick={() => navigate(`/service/hotel-stays/${hotel.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/service/hotel-stays/${hotel.id}`)}
              >
                <div className="hotel-card-img-wrap">
                  {hotel.cover_photo_url ? (
                    <img className="hotel-card-img" src={hotel.cover_photo_url} alt={hotel.property_name} loading="lazy" />
                  ) : (
                    <div className="hotel-card-img-placeholder">
                      <span style={{ fontSize: 36 }}>🏨</span>
                      <span>No photo yet</span>
                    </div>
                  )}
                  <span className={`hotel-card-badge ${hotel.property_type}`}>
                    {hotel.property_type}
                  </span>
                  <button
                    className={`hotel-card-fav ${favorites.has(hotel.id) ? 'active' : ''}`}
                    onClick={e => toggleFavorite(e, hotel.id)}
                    aria-label={favorites.has(hotel.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favorites.has(hotel.id) ? '❤️' : '🤍'}
                  </button>
                  {hotel.price_per_night && (
                    <div className="hotel-card-price-badge">₹{hotel.price_per_night.toLocaleString()}/night</div>
                  )}
                </div>
                <div className="hotel-card-body">
                  <p className="hotel-card-name">{hotel.property_name}</p>
                  <div className="hotel-card-location">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    {hotel.district || 'Location not set'}
                  </div>
                  <div className="hotel-card-meta">
                    <div className="hotel-card-rating">
                      ⭐ {Number(hotel.rating) > 0 ? Number(hotel.rating).toFixed(1) : 'New'}
                      {hotel.review_count > 0 && (
                        <span style={{ fontWeight: 400, color: '#6b7a90', fontSize: 12 }}>
                          &nbsp;({hotel.review_count})
                        </span>
                      )}
                    </div>
                    <div className="hotel-card-amenities">
                      {(hotel.amenities || []).slice(0, 3).map(a => (
                        <span key={a} className="hotel-card-amenity-dot" title={a}>
                          {AMENITY_EMOJI_MAP[a] || '✓'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="hotel-pagination">
              <button className="hotel-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`hotel-page-btn ${page === p ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button className="hotel-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </Screen>
  );
};

export default HotelStaysPage;
