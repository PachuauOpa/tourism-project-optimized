import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import { BottomNav } from '../../components/shared/BottomNav';
import SearchIcon from '../../components/SearchIcon';
import FilterIcon from '../../components/FilterIcon';
import ClockIcon from '../../components/ClockIcon';
import FilterDropdown from '../../components/FilterDropdown';
import ProgressiveImage from '../../components/shared/ProgressiveImage';
import { Destination, ActiveFilters, ManagedDestinationRecord } from '../../types';
import {
  fetchManagedDestinations,
  prefetchManagedDestinationBySlug,
  toDestinationCards
} from '../../utils/destinationApi';

const DestinationsGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('search')?.toLowerCase() || '';
  const filtersParam = searchParams.get('filters');
  const sortParam = searchParams.get('sort') || 'popular';

  const [searchValue, setSearchValue] = useState<string>(query);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [sortBy, setSortBy] = useState<string>(sortParam);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCompactGrid, setIsCompactGrid] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [managedDestinations, setManagedDestinations] = useState<ManagedDestinationRecord[]>([]);
  const [isDestinationsLoading, setIsDestinationsLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const itemsPerPage = 12;

  const sourceDestinations: Destination[] = toDestinationCards(managedDestinations);

  // Function to request location
  const requestLocation = () => {
    console.log('Requesting location permission...');

    if (!('geolocation' in navigator)) {
      const errorMsg = 'Geolocation not supported by your browser.';
      console.error(errorMsg);
      setLocationError(errorMsg);
      return;
    }

    console.log('Geolocation API is available, requesting position...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location granted:', position.coords);
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError('');
      },
      (error) => {
        console.error('Location error:', error.code, error.message);
        let errorMsg = 'Unable to get your location. ';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += 'Permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMsg += 'Location request timed out.';
            break;
          default:
            errorMsg += 'An unknown error occurred.';
        }

        setLocationError(errorMsg);
      },
      {
        timeout: 10000,
        enableHighAccuracy: true,
        maximumAge: 0 // Don't use cached position
      }
    );
  };

  // Request user location permission when page loads
  useEffect(() => {
    console.log('DestinationsGalleryPage mounted, requesting location...');
    requestLocation();
  }, []);

  // Initialize filters from URL
  useEffect(() => {
    if (filtersParam) {
      try {
        setActiveFilters(JSON.parse(filtersParam));
      } catch {
        setActiveFilters({});
      }
    }
  }, [filtersParam]);

  // Load destinations with user location
  useEffect(() => {
    const loadManagedDestinations = async () => {
      setIsDestinationsLoading(true);

      try {
        const params: {
          lat?: number;
          lng?: number;
        } = {};

        if (userLocation) {
          params.lat = userLocation.lat;
          params.lng = userLocation.lng;
        }

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

  // Apply filters and search
  const filteredResults = useMemo((): Destination[] => {
    let results = [...sourceDestinations];

    // Apply text search
    if (query) {
      results = results.filter((destination) => {
        const searchText = `${destination.name} ${destination.short} ${destination.detail} ${destination.activityType.join(' ')} ${destination.typeTags.join(' ')}`.toLowerCase();
        return searchText.includes(query);
      });
    }

    // Apply filters
    if (Object.keys(activeFilters).length > 0) {
      results = results.filter((destination) => {
        // Region filter
        if (activeFilters.region && activeFilters.region.length > 0) {
          if (!activeFilters.region.includes(destination.region)) return false;
        }

        // Activity type filter
        if (activeFilters.activityType && activeFilters.activityType.length > 0) {
          if (!activeFilters.activityType.some(activity => destination.activityType.includes(activity))) return false;
        }

        // Difficulty filter
        if (activeFilters.difficulty && activeFilters.difficulty.length > 0) {
          if (!activeFilters.difficulty.includes(destination.difficulty)) return false;
        }

        // Duration filter
        if (activeFilters.duration && activeFilters.duration.length > 0) {
          if (!activeFilters.duration.includes(destination.duration)) return false;
        }

        // Type filter
        if (activeFilters.type && activeFilters.type.length > 0) {
          if (!activeFilters.type.some((typeTag) => destination.typeTags.includes(typeTag))) return false;
        }

        // Season filter
        if (activeFilters.season && activeFilters.season.length > 0) {
          if (!activeFilters.season.some(season => destination.bestSeason.includes(season))) return false;
        }

        return true;
      });
    }

    // Apply sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return parseFloat(b.rating) - parseFloat(a.rating);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'distance':
          return parseInt(a.time) - parseInt(b.time);
        default:
          return 0;
      }
    });

    return results;
  }, [query, activeFilters, sortBy, sourceDestinations]);

  // Pagination
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentResults = filteredResults.slice(startIndex, startIndex + itemsPerPage);

  // Handle search
  const handleSearch = (searchTerm: string) => {
    const newParams = new URLSearchParams();
    if (searchTerm) newParams.set('search', searchTerm);
    if (Object.keys(activeFilters).length > 0) newParams.set('filters', JSON.stringify(activeFilters));
    if (sortBy !== 'popular') newParams.set('sort', sortBy);

    navigate(`/destinations-gallery?${newParams.toString()}`);
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
    const newParams = new URLSearchParams();
    if (searchValue) newParams.set('search', searchValue);
    if (Object.keys(newFilters).length > 0) newParams.set('filters', JSON.stringify(newFilters));
    if (sortBy !== 'popular') newParams.set('sort', sortBy);

    navigate(`/destinations-gallery?${newParams.toString()}`);
    setCurrentPage(1);
  };

  const handleGridViewToggle = () => {
    if (viewMode !== 'grid') {
      setViewMode('grid');
      setIsCompactGrid(false);
      return;
    }

    setIsCompactGrid((previous) => !previous);
  };

  const handleListViewToggle = () => {
    setViewMode('list');
    setIsCompactGrid(false);
  };

  const preloadDestinationTemplate = (slug: string) => {
    void import('./DestinationsTemplatePage');
    void prefetchManagedDestinationBySlug(slug);
  };

  const handleViewDetails = (slug: string) => {
    preloadDestinationTemplate(slug);
    navigate(`/destinations-template/${slug}`);
  };

  // Filter categories
  const filterCategories = [
    {
      key: 'region',
      title: 'Region',
      options: [
        { label: 'North', value: 'North', description: 'Northern Mizoram destinations' },
        { label: 'South', value: 'South', description: 'Southern Mizoram destinations' },
        { label: 'East', value: 'East', description: 'Eastern Mizoram destinations' },
        { label: 'West', value: 'West', description: 'Western Mizoram destinations' },
        { label: 'Central', value: 'Central', description: 'Central Mizoram destinations' }
      ]
    },
    {
      key: 'activityType',
      title: 'Activities',
      options: [
        { label: 'Trekking', value: 'trekking', description: 'Hiking and mountain trails' },
        { label: 'Cultural', value: 'cultural', description: 'Heritage and local culture' },
        { label: 'Photography', value: 'photography', description: 'Scenic photo opportunities' },
        { label: 'Adventure', value: 'adventure', description: 'Thrilling outdoor activities' },
        { label: 'Wildlife', value: 'wildlife', description: 'Nature and animal watching' },
        { label: 'Relaxation', value: 'relaxation', description: 'Peaceful and serene spots' }
      ]
    },
    {
      key: 'difficulty',
      title: 'Difficulty',
      options: [
        { label: 'Easy', value: 'easy', description: 'Suitable for all fitness levels' },
        { label: 'Moderate', value: 'moderate', description: 'Requires moderate fitness' },
        { label: 'Challenging', value: 'challenging', description: 'For experienced adventurers' }
      ]
    },
    {
      key: 'duration',
      title: 'Duration',
      options: [
        { label: 'Half Day', value: 'half-day', description: '2-4 hours visit' },
        { label: 'Full Day', value: 'full-day', description: '6-8 hours visit' },
        { label: 'Multi-day', value: '2-days', description: 'Overnight stay required' }
      ]
    },
    {
      key: 'type',
      title: 'Type',
      options: [
        { label: 'Mountain', value: 'mountain', description: 'Peaks and hill ranges' },
        { label: 'Waterfall', value: 'waterfall', description: 'Natural water cascades' },
        { label: 'Cultural Site', value: 'cultural-site', description: 'Heritage locations' },
        { label: 'Lake', value: 'lake', description: 'Natural water bodies' },
        { label: 'National Park', value: 'national-park', description: 'Protected natural areas' },
        { label: 'Wildlife Reserve', value: 'wildlife-reserve', description: 'Animal sanctuaries' }
      ]
    }
  ];

  return (
    <Screen className="destinations-gallery-screen">
      {/* Header */}
      <div className="gallery-header">
        <div className="gallery-header-top">
          <button type="button" className="back-btn" onClick={() => navigate('/home')}>
            ← Back to Home
          </button>
          <h1 className="gallery-title">Explore Destinations</h1>
          <div className="gallery-view-controls">
            <button
              type="button"
              className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={handleGridViewToggle}
              aria-label={isCompactGrid ? 'Normal grid view' : 'Compact grid view'}
            >
              ⊞
            </button>
            <button
              type="button"
              className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
              onClick={handleListViewToggle}
              aria-label="List view"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="gallery-search-section">
          <div className="search-bar">
            <SearchIcon size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search destinations"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchValue)}
            />
            <button type="button" className="search-btn" onClick={() => handleSearch(searchValue)}>
              Search
            </button>
          </div>

          <div className="filter-sort-controls">
            <FilterDropdown
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              onApplyFilters={handleFilterChange}
              categories={filterCategories}
              activeFilters={activeFilters}
              presentation="bottom-sheet"
            />

            <button
              type="button"
              className={`filter-btn ${Object.keys(activeFilters).length > 0 ? 'active' : ''}`}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <FilterIcon size={16} />
              Filters
              {Object.keys(activeFilters).length > 0 && (
                <span className="filter-count">
                  {Object.values(activeFilters).reduce((total, filters) => total + filters.length, 0)}
                </span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="popular">Most Popular</option>
              <option value="name">Name A-Z</option>
              <option value="distance">Nearest First</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="results-summary">
          <p>
            Showing {filteredResults.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredResults.length)} of {filteredResults.length} destinations
            {query && ` for "${query}"`}
            {userLocation && <span className="location-indicator"> · Distances calculated from your location</span>}
          </p>
          {locationError && (
            <div className="location-error-container">
              <p className="location-error">{locationError}</p>
              <button
                type="button"
                className="retry-location-btn"
                onClick={requestLocation}
              >
                Enable Location
              </button>
            </div>
          )}

          {/* Active Filters Display */}
          {Object.keys(activeFilters).length > 0 && (
            <div className="active-filters">
              {Object.entries(activeFilters).map(([category, values]) =>
                values.map(value => (
                  <span key={`${category}-${value}`} className="filter-tag">
                    {value}
                    <button
                      type="button"
                      onClick={() => {
                        const newFilters = {
                          ...activeFilters,
                          [category]: values.filter(v => v !== value)
                        };
                        if (newFilters[category].length === 0) {
                          delete newFilters[category];
                        }
                        handleFilterChange(newFilters);
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
              <button
                type="button"
                className="clear-filters"
                onClick={() => handleFilterChange({})}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Grid/List */}
      <div className={`destinations-results ${viewMode}${viewMode === 'grid' && isCompactGrid ? ' compact' : ''}`}>
        {isDestinationsLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <article key={`destination-skeleton-${index}`} className={`destination-card ${viewMode} skeleton-card`} aria-hidden="true">
              <div className="destination-image skeleton-block" />

              <div className="destination-content">
                <div className="destination-header">
                  <div className="destination-skeleton-title skeleton-block" />
                  <div className="destination-skeleton-rating skeleton-block" />
                </div>

                <div className="destination-skeleton-line skeleton-block" />
                <div className="destination-skeleton-line short skeleton-block" />

                <div className="destination-meta">
                  <div className="destination-skeleton-chip skeleton-block" />
                  <div className="destination-skeleton-chip skeleton-block" />
                  <div className="destination-skeleton-chip skeleton-block" />
                </div>

                <div className="destination-tags">
                  <div className="destination-skeleton-tag skeleton-block" />
                  <div className="destination-skeleton-tag skeleton-block" />
                </div>

                <div className="destination-actions">
                  <div className="destination-skeleton-action skeleton-block" />
                  <div className="destination-skeleton-action skeleton-block" />
                </div>
              </div>
            </article>
          ))
        ) : currentResults.length === 0 ? (
          <div className="no-results">
            <h3>No destinations found</h3>
            <p>Try adjusting your search criteria or filters</p>
            <button type="button" className="primary-btn" onClick={() => {
              setSearchValue('');
              setActiveFilters({});
              handleSearch('');
            }}>
              Show All Destinations
            </button>
          </div>
        ) : (
          currentResults.map((destination) => {
            const isCompactCard = viewMode === 'grid' && isCompactGrid;
            const displayTags = Array.from(
              new Set([
                ...destination.activityType,
                ...destination.typeTags
              ].map((tag) => tag.trim()).filter((tag) => tag.length > 0))
            ).slice(0, 4);

            if (displayTags.length === 0) {
              displayTags.push(destination.difficulty, destination.duration);
            }

            return (
            <article key={destination.id} className={`destination-card ${viewMode}${viewMode === 'grid' && isCompactGrid ? ' compact' : ''}`}>
              <ProgressiveImage
                src={destination.image}
                variants={destination.imageVariants}
                alt={destination.name}
                className="destination-image"
              />

              <div className="destination-content">
                <div className="destination-header">
                  <h3 className="destination-name">{destination.name}</h3>
                  <div className="destination-rating">
                    ★ {destination.rating}
                  </div>
                </div>

                <p className="destination-description">{destination.short}</p>

                <div className="destination-meta">
                  <div className="meta-item">
                    <ClockIcon size={14} />
                    <span>{destination.time}</span>
                  </div>
                  <div className="meta-item">
                    <span className="difficulty-badge">{destination.difficulty}</span>
                  </div>
                  <div className="meta-item">
                    <span className="duration-badge">{destination.duration}</span>
                  </div>
                </div>

                <div className="destination-tags">
                  {displayTags.slice(0, isCompactCard ? 2 : 4).map((tag) => (
                    <span key={tag} className="activity-tag">{tag}</span>
                  ))}
                </div>

                <div className="destination-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onMouseEnter={() => preloadDestinationTemplate(destination.id)}
                    onFocus={() => preloadDestinationTemplate(destination.id)}
                    onPointerDown={() => preloadDestinationTemplate(destination.id)}
                    onClick={() => handleViewDetails(destination.id)}
                  >
                    {isCompactCard ? 'Details' : 'View Details'}
                  </button>
                  {!isCompactCard && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => navigate(`/search?query=${destination.name}`)}
                    >
                      Similar Places
                    </button>
                  )}
                </div>
              </div>
            </article>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ← Previous
          </button>

          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                className={`page-number ${page === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next →
          </button>
        </div>
      )}

      <footer className="screen-footer">
        <img src="/icons/lushai-tech.svg" alt="LushAiTech" />
      </footer>

      <BottomNav />
    </Screen>
  );
};

export default DestinationsGalleryPage;
