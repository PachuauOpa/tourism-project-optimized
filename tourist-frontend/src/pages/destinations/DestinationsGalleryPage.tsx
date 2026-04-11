import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';
import { BottomNav } from '../../components/shared/BottomNav';
import SearchIcon from '../../components/SearchIcon';
import FilterIcon from '../../components/FilterIcon';
import ClockIcon from '../../components/ClockIcon';
import FilterDropdown from '../../components/FilterDropdown';
import ProgressiveImage from '../../components/shared/ProgressiveImage';
import {
  ActiveFilters,
  Destination,
  DestinationFilterConfig,
  FilterCategory,
  ManagedDestinationRecord
} from '../../types';
import {
  fetchDestinationFilterConfig,
  fetchManagedDestinations,
  prefetchManagedDestinationBySlug,
  toDestinationCards
} from '../../utils/destinationApi';
import { getCachedUserLocation, requestUserLocation } from '../../utils/geolocation';
import useFavoriteDestinations from '../../hooks/useFavoriteDestinations';
import {
  buildDestinationCategoryFilter,
  DEFAULT_DESTINATION_FILTER_CONFIG,
  getDefaultAppliesToCategoriesForFilterGroup
} from '../../data/destinationFilterConfig';

const normalizeTag = (value: string): string => value.trim().toLowerCase();

const collectSimilarityTags = (destination: Destination): string[] => (
  Array.from(
    new Set(
      [
        ...destination.activityType,
        ...destination.typeTags
      ]
        .map(normalizeTag)
        .filter((tag) => tag.length > 0)
    )
  )
);

const getLocationErrorMessage = (error: unknown): string => {
  const fallback = 'Unable to get your location. An unknown error occurred.';

  if (!error || typeof error !== 'object' || !('code' in error)) {
    return fallback;
  }

  const locationError = error as GeolocationPositionError;
  switch (locationError.code) {
    case locationError.PERMISSION_DENIED:
      return 'Unable to get your location. Permission denied. Please enable location access in your browser settings.';
    case locationError.POSITION_UNAVAILABLE:
      return 'Unable to get your location. Location information unavailable.';
    case locationError.TIMEOUT:
      return 'Unable to get your location. Location request timed out.';
    default:
      return fallback;
  }
};

const normalizeFilterConfig = (config: DestinationFilterConfig | null | undefined): DestinationFilterConfig => {
  if (!config || !Array.isArray(config.categories)) {
    return DEFAULT_DESTINATION_FILTER_CONFIG;
  }

  const categories = config.categories
    .map((category) => {
      const key = String(category.key || '').trim();
      const options = Array.isArray(category.options)
        ? category.options
          .map((option) => {
            const value = String(option.value || '').trim();
            if (!value) {
              return null;
            }

            return {
              value,
              label: String(option.label || value).trim() || value,
              description: String(option.description || '').trim(),
              bracketText: String(option.bracketText || '').trim() || undefined
            };
          })
          .filter(Boolean)
        : [];

      if (!key || options.length === 0) {
        return null;
      }

      return {
        key,
        title: String(category.title || key).trim() || key,
        appliesToCategories: (() => {
          const configuredScope = Array.isArray(category.appliesToCategories)
            ? category.appliesToCategories.map((item) => String(item || '').trim()).filter(Boolean)
            : [];

          if (configuredScope.length > 0) {
            return configuredScope;
          }

          return getDefaultAppliesToCategoriesForFilterGroup(key);
        })(),
        options
      };
    })
    .filter(Boolean);

  if (categories.length === 0) {
    return DEFAULT_DESTINATION_FILTER_CONFIG;
  }

  const normalizedCategories = categories as FilterCategory[];
  const incomingByKey = new Map(normalizedCategories.map((category) => [category.key, category]));

  return {
    categories: DEFAULT_DESTINATION_FILTER_CONFIG.categories.map((defaultCategory) => (
      incomingByKey.get(defaultCategory.key) || defaultCategory
    ))
  };
};

const DestinationsGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('search')?.toLowerCase() || '';
  const filtersParam = searchParams.get('filters');
  const similarToParam = searchParams.get('similarTo') || '';
  const similarTagsParam = searchParams.get('similarTags') || '';
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
  const [filterConfig, setFilterConfig] = useState<DestinationFilterConfig>(DEFAULT_DESTINATION_FILTER_CONFIG);
  const [isFilterConfigLoading, setIsFilterConfigLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const { isFavorite, toggleFavorite } = useFavoriteDestinations();
  const itemsPerPage = 12;

  const sourceDestinations: Destination[] = toDestinationCards(managedDestinations);
  const similarSourceDestination = useMemo(
    () => sourceDestinations.find((destination) => destination.id === similarToParam) ?? null,
    [sourceDestinations, similarToParam]
  );

  const similarTags = useMemo(
    () => Array.from(new Set(similarTagsParam.split(',').map(normalizeTag).filter((tag) => tag.length > 0))),
    [similarTagsParam]
  );

  const isSimilarityMode = Boolean(similarToParam);

  const filterCategories = useMemo((): FilterCategory[] => {
    const categoryFilter = buildDestinationCategoryFilter();
    return [categoryFilter, ...filterConfig.categories];
  }, [filterConfig]);

  const filterLabelByCategoryAndValue = useMemo(() => {
    const labelMap: Record<string, Record<string, string>> = {};

    for (const category of filterCategories) {
      labelMap[category.key] = {};
      for (const option of category.options) {
        const label = option.bracketText ? `${option.label} (${option.bracketText})` : option.label;
        labelMap[category.key][option.value] = label;
      }
    }

    return labelMap;
  }, [filterCategories]);

  const requestLocation = useCallback((): void => {
    const cachedLocation = getCachedUserLocation();
    if (cachedLocation) {
      setUserLocation(cachedLocation);
      setLocationError('');
      return;
    }

    void requestUserLocation({
      timeout: 3500,
      enableHighAccuracy: false,
      maximumAge: 5 * 60 * 1000
    })
      .then((location) => {
        setUserLocation(location);
        setLocationError('');
      })
      .catch((error) => {
        setLocationError(getLocationErrorMessage(error));
      });
  }, []);

  // Request user location permission when page loads
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      requestLocation();
    }, 400);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [requestLocation]);

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

  useEffect(() => {
    let isMounted = true;

    const loadFilterConfig = async () => {
      setIsFilterConfigLoading(true);
      try {
        const config = await fetchDestinationFilterConfig();
        if (isMounted) {
          setFilterConfig(normalizeFilterConfig(config));
        }
      } catch {
        if (isMounted) {
          setFilterConfig(DEFAULT_DESTINATION_FILTER_CONFIG);
        }
      } finally {
        if (isMounted) {
          setIsFilterConfigLoading(false);
        }
      }
    };

    void loadFilterConfig();

    return () => {
      isMounted = false;
    };
  }, []);

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
    const similarityScores = new Map<string, number>();

    // Apply text search
    if (query) {
      results = results.filter((destination) => {
        const searchText = `${destination.name} ${destination.short} ${destination.detail} ${destination.activityType.join(' ')} ${destination.typeTags.join(' ')}`.toLowerCase();
        return searchText.includes(query);
      });
    }

    if (isSimilarityMode) {
      const sourceType = normalizeTag(
        similarSourceDestination?.destinationCategory || activeFilters.destinationCategory?.[0] || ''
      );

      results = results.filter((destination) => {
        if (destination.id === similarToParam) {
          return false;
        }

        const destinationType = normalizeTag(destination.destinationCategory || '');
        const sameCategory = !sourceType || destinationType === sourceType;

        if (!sameCategory) {
          return false;
        }

        if (similarTags.length === 0) {
          return true;
        }

        const destinationTags = new Set(collectSimilarityTags(destination));
        const overlapCount = similarTags.reduce((total, tag) => (destinationTags.has(tag) ? total + 1 : total), 0);

        if (overlapCount > 0) {
          similarityScores.set(destination.id, overlapCount);
          return true;
        }

        return false;
      });
    }

    // Apply filters
    if (Object.keys(activeFilters).length > 0) {
      results = results.filter((destination) => {
        if (activeFilters.destinationCategory && activeFilters.destinationCategory.length > 0) {
          if (!activeFilters.destinationCategory.includes(destination.destinationCategory || '')) {
            return false;
          }
        }

        const destinationFilterTags = destination.filterTags || [];

        for (const category of filterCategories) {
          if (category.key === 'destinationCategory') {
            continue;
          }

          const selectedValues = activeFilters[category.key] || [];
          if (selectedValues.length === 0) {
            continue;
          }

          const hasMatch = selectedValues.some((value) => destinationFilterTags.includes(value));
          if (!hasMatch) {
            return false;
          }
        }

        return true;
      });
    }

    // Apply sorting
    results.sort((a, b) => {
      if (isSimilarityMode) {
        const overlapDifference = (similarityScores.get(b.id) || 0) - (similarityScores.get(a.id) || 0);
        if (overlapDifference !== 0) {
          return overlapDifference;
        }
      }

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
  }, [
    query,
    activeFilters,
    sortBy,
    sourceDestinations,
    isSimilarityMode,
    similarSourceDestination,
    similarToParam,
    similarTags,
    filterCategories
  ]);

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

  const handleShowSimilarPlaces = (destination: Destination) => {
    const similarityFilters: ActiveFilters = {};

    if (destination.destinationCategory) {
      similarityFilters.destinationCategory = [destination.destinationCategory];
    }

    const similarityParams = new URLSearchParams();
    similarityParams.set('similarTo', destination.id);
    similarityParams.set('similarTags', collectSimilarityTags(destination).join(','));

    if (Object.keys(similarityFilters).length > 0) {
      similarityParams.set('filters', JSON.stringify(similarityFilters));
    }

    if (sortBy !== 'popular') {
      similarityParams.set('sort', sortBy);
    }

    setSearchValue('');
    setActiveFilters(similarityFilters);
    setCurrentPage(1);
    navigate(`/destinations-gallery?${similarityParams.toString()}`);
  };

  const handleToggleFavorite = (destinationId: string) => {
    const result = toggleFavorite(destinationId);
    if (!result.ok && result.reason === 'AUTH_REQUIRED') {
      navigate('/profile');
    }
  };

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
              disabled={isFilterConfigLoading}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <FilterIcon size={16} />
              {isFilterConfigLoading ? 'Loading Filters...' : 'Filters'}
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
            {isSimilarityMode && similarSourceDestination && ` similar to ${similarSourceDestination.name}`}
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
                    {filterLabelByCategoryAndValue[category]?.[value] || value}
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
                  <button
                    type="button"
                    className={`favorite-pill-btn ${isFavorite(destination.id) ? 'active' : ''}`}
                    onClick={() => handleToggleFavorite(destination.id)}
                  >
                    {isFavorite(destination.id) ? '❤ Saved' : '❤ Favorite'}
                  </button>
                  {!isCompactCard && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => handleShowSimilarPlaces(destination)}
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
        <img src="/icons/lushai-tech.svg" alt="LushAiTech" width="121" height="32" loading="lazy" decoding="async" />
      </footer>

      <BottomNav />
    </Screen>
  );
};

export default DestinationsGalleryPage;
