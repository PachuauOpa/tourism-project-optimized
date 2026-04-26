import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../components/shared/Screen';
import AnimatedSection from '../components/shared/AnimatedSection';
import HeaderLogo from '../components/shared/HeaderLogo';
import BottomNav from '../components/shared/BottomNav';
import SearchIcon from '../components/SearchIcon';
import FilterIcon from '../components/FilterIcon';
import FilterDropdown from '../components/FilterDropdown';
import CarRentalIcon from '../components/CarRentalIcon';
import StaysIcon from '../components/StaysIcon';
import ExperiencesIcon from '../components/ExperiencesIcon';
import AIIcon from '../components/AIIcon';
import { ActiveFilters, Destination, ManagedDestinationRecord } from '../types';
import { fetchManagedDestinations, toDestinationCards } from '../utils/destinationApi';

const FeaturedLocationIcon: React.FC = () => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M8.51304 20.2C8.51304 20.2 16.0261 13.5217 16.0261 8.51304C16.0261 4.3637 12.6624 1 8.51304 1C4.3637 1 1 4.3637 1 8.51304C1 13.5217 8.51304 20.2 8.51304 20.2Z"
      stroke="#3095EC"
      strokeWidth="2"
    />
    <path
      d="M10.9134 8.20015C10.9134 9.52563 9.83883 10.6002 8.51335 10.6002C7.18787 10.6002 6.11335 9.52563 6.11335 8.20015C6.11335 6.87467 7.18787 5.80015 8.51335 5.80015C9.83883 5.80015 10.9134 6.87467 10.9134 8.20015Z"
      stroke="#3095EC"
      strokeWidth="2"
    />
  </svg>
);

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState<string>('');
  const [ilpNote] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [showSosButton, setShowSosButton] = useState<boolean>(false);
  const [sosButtonAnimating, setSosButtonAnimating] = useState<boolean>(false);
  const [managedDestinations, setManagedDestinations] = useState<ManagedDestinationRecord[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isDestinationsLoading, setIsDestinationsLoading] = useState<boolean>(true);

  const destinationCards: Destination[] = toDestinationCards(managedDestinations);

  const featuredCards: Destination[] = (() => {
    const featuredOnly = destinationCards.filter((item) => item.featured);
    return (featuredOnly.length > 0 ? featuredOnly : destinationCards).slice(0, 8);
  })();

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => { console.warn('Location access denied on HomePage:', error.message); },
        { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = (): void => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollHeight = document.documentElement.scrollHeight;
          const scrollTop = document.documentElement.scrollTop;
          const clientHeight = document.documentElement.clientHeight;
          const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

          if (isNearBottom && !showSosButton) {
            setShowSosButton(true);
            setSosButtonAnimating(false);
          } else if (!isNearBottom && showSosButton && !sosButtonAnimating) {
            setSosButtonAnimating(true);
            setTimeout(() => { setShowSosButton(false); setSosButtonAnimating(false); }, 300);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showSosButton, sosButtonAnimating]);

  useEffect(() => {
    const loadManagedDestinations = async () => {
      setIsDestinationsLoading(true);
      try {
        const params: { lat?: number; lng?: number } = {};
        if (userLocation) { params.lat = userLocation.lat; params.lng = userLocation.lng; }
        const data = await fetchManagedDestinations(params);
        setManagedDestinations(data);
      } catch {
        setManagedDestinations([]);
      } finally {
        setIsDestinationsLoading(false);
      }
    };
    void loadManagedDestinations();
  }, [userLocation]);

  const handleFilterApply = (filters: ActiveFilters): void => {
    setActiveFilters(filters);
    const searchParams = new URLSearchParams();
    if (searchValue) searchParams.set('search', searchValue);
    if (Object.keys(filters).length > 0) searchParams.set('filters', JSON.stringify(filters));
    navigate(`/destinations-gallery?${searchParams.toString()}`);
  };

  const handleFilterToggle = (): void => setIsFilterOpen(!isFilterOpen);

  const handleOpenDestination = (destinationId: string): void => {
    navigate(`/destinations-template/${encodeURIComponent(destinationId)}`);
  };

  const truncateFeaturedDescription = (text: string, maxLength = 95): string => {
    if (text.length <= maxLength) return text;
    const trimmed = text.slice(0, maxLength).trimEnd().replace(/[\s.,;:!?-]+$/g, '');
    return `${trimmed}.....`;
  };

  const formatDistanceLabel = (text: string): string => {
    return text
      .replace(/\s*from your location/gi, '')
      .replace(/\s*(--|—|–|-)\s*$/g, '')
      .trim();
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const searchParams = new URLSearchParams();
    searchParams.set('search', searchValue);
    if (Object.keys(activeFilters).length > 0) searchParams.set('filters', JSON.stringify(activeFilters));
    const isDestinationSearch =
      searchValue.toLowerCase().includes('place') ||
      searchValue.toLowerCase().includes('destination') ||
      destinationCards.some(dest =>
        dest.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        dest.activityType.some(a => a.toLowerCase().includes(searchValue.toLowerCase()))
      );
    if (isDestinationSearch || Object.keys(activeFilters).length > 0) {
      navigate(`/destinations-gallery?${searchParams.toString()}`);
    } else {
      searchParams.delete('search');
      searchParams.set('query', searchValue);
      navigate(`/search?${searchParams.toString()}`);
    }
  };

  const filterCount = Object.values(activeFilters).reduce((total, f) => total + f.length, 0);
  const filterChipClass = `filter-chip ${filterCount > 0 ? 'filter-chip-active' : ''} ${isFilterOpen ? 'filter-chip-open' : ''}`;
  const visitorConductItems = [
    'Keep Mizoram pristine, carry your waste and leave no trace.',
    'Respect the YMA and local community governance.',
    'Sunday is a day of rest, nearby services close.',
    'Alcohol is regulated, check local guidelines.',
    'Seek permission before photographing people or churches.',
  ];

  return (
    <Screen className="home-screen">
      {/* ── Header / Brand ── */}
      <AnimatedSection delay={0.03} className="top-section home-hero-top">
          <HeaderLogo />

          <form className="search-row" onSubmit={handleSearchSubmit}>
            <SearchIcon size={24} className="search-icon" />
            <input
              placeholder="Search destination or service"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button type="button" className={filterChipClass} onClick={handleFilterToggle}>
              <FilterIcon size={16} />
              {filterCount > 0 && <span className="filter-count">{filterCount}</span>}
            </button>
            <FilterDropdown
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              onApplyFilters={handleFilterApply}
            />
          </form>
        </AnimatedSection>

      {/* ── Entry Requirement ── */}
      <AnimatedSection delay={0.06} className="stack-section home-ilp-section-mobile">
        <div className="ilp-glow-wrapper">
          <div className="ilp-border" />
          <div className="ilp-card-blue">
            <div className="home-ilp-topline">
              <div className="mandatory-badge">
                <img src="/icons/ilp-mandatory.svg" alt="Mandatory" />
                Mandatory
              </div>
              <p className="home-ilp-right-title">Entry Requirement</p>
            </div>
            <h4>Inner Line Permit (ILP)</h4>
            <p>Apply digitally, QR-code ILP, Breeze through checkpoints -- even offline.</p>
            <button type="button" className="ilp-apply-button" onClick={() => navigate('/ilp')}>
              Apply now
              <img src="/icons/ilp-arrow.svg" alt="" aria-hidden="true" />
            </button>
          </div>
        </div>
        {ilpNote ? <p className="micro-note">{ilpNote}</p> : null}
      </AnimatedSection>

      {/* ── Featured Destinations ── */}
      <AnimatedSection delay={0.12} className="stack-section home-featured-section">
        <h3 className="section-title">Featured Destinations</h3>
        <div className="featured_des_horizontal-cards">
          {isDestinationsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
              <article className="featured_des_place-card skeleton-card" key={`sk-${i}`} aria-hidden="true">
                <div className="featured_des_place-image skeleton-block" />
                <div className="featured_des_skeleton-title skeleton-block" />
                <div className="featured_des_skeleton-text skeleton-block" />
                <div className="featured_des_skeleton-text short skeleton-block" />
                <div className="featured_des_card-foot">
                  <div className="featured_des_skeleton-meta skeleton-block" />
                  <div className="featured_des_skeleton-btn skeleton-block" />
                </div>
              </article>
            ))
            : featuredCards.map((place) => (
              <article className="featured_des_place-card" key={place.id}>
                <img src={place.image} alt={place.name} className="featured_des_place-image" />
                <h4>{place.name}</h4>
                <p>{truncateFeaturedDescription(place.short)}</p>
                <div className="featured_des_card-foot">
                  <small>
                    <FeaturedLocationIcon />
                    {formatDistanceLabel(place.time)}
                  </small>
                  <button type="button" onClick={() => handleOpenDestination(place.id)} aria-label={`Open ${place.name}`}>
                    <span>Read more</span>
                    <svg width="16" height="16" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path
                        d="M1 9.33333L9.33333 1M9.33333 1H1M9.33333 1V9.33333"
                        stroke="#3095EC"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
        </div>

        {!isDestinationsLoading && featuredCards.length === 0 && (
          <p className="featured_des_empty">No destinations are published yet.</p>
        )}

        <div className="home-featured-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={() => navigate('/destinations-gallery')}
            style={{ minWidth: '160px' }}
          >
            View All Destinations
          </button>
        </div>
      </AnimatedSection>

      {/* ── Essential Services ── */}
      <AnimatedSection delay={0.18} className="stack-section home-services-section">
        <h3 className="section-title">Essential Services</h3>
        <div className="service-grid">
          <button type="button" onClick={() => navigate('/service/cab-rentals')}>
            <div className="service-icon-circle"><CarRentalIcon size={35} /></div>
            Cab Rentals
          </button>
          <button type="button" onClick={() => navigate('/service/hotel-stays')}>
            <div className="service-icon-circle"><StaysIcon size={41} /></div>
            Hotel Stays
          </button>
          <button type="button" onClick={() => navigate('/service/experiences')}>
            <div className="service-icon-circle"><ExperiencesIcon size={41} /></div>
            Experiences
          </button>
        </div>
      </AnimatedSection>

      {/* ── AI Planner ── */}
      <AnimatedSection delay={0.22} className="stack-section AI-Plan_section">
        <h3 className="section-title">Create Your Journey</h3>
        <div className="AI-Plan_planner-card">
          <div className="AI-Plan_planner-header">
            <AIIcon size={19} />
            <h4>AI Planner</h4>
          </div>
          <p className="AI-Plan_planner-subtitle">Generate an itinerary according to your day plan.</p>
          <div className="AI-Plan_gemini">
            <div className="AI-Plan_border"></div>
            <div className="AI-Plan_input-wrapper">
              <input type="text" placeholder="E.g. Generate plan for a hill trip." className="AI-Plan_input" />
              <AIIcon size={20} className="AI-Plan_input-icon" />
            </div>
          </div>
          <button type="button" className="primary-btn">
            <span>Generate Plan</span>
          </button>
        </div>
      </AnimatedSection>

      {/* ── Code of Conduct (Mobile) ── */}
      <AnimatedSection delay={0.26} className="stack-section home-mobile-only">
        <h3 className="conduct-head">VISITOR CODE OF CONDUCT</h3>
        <ul className="conduct-list">
          {visitorConductItems.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </AnimatedSection>

      {showSosButton && (
        <button
          type="button"
          className={`floating-sos-btn ${sosButtonAnimating ? 'exiting' : ''}`}
          onClick={() => navigate('/sos')}
          aria-label="Emergency SOS"
        >
          SOS
        </button>
      )}

      <footer className="screen-footer">
        <img src="/icons/lushai-tech.svg" alt="LushAiTech" />
      </footer>

      <BottomNav />
    </Screen>
  );
};

export default HomePage;
