import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Screen from '../../components/shared/Screen';
import FolkloreTemplatePage from './FolkloreTemplatePage';
import ProgressiveImage from '../../components/shared/ProgressiveImage';
import { ActiveFilters, DestinationFilterConfig, ManagedDestinationRecord } from '../../types';
import {
  fetchDestinationFilterConfig,
  fetchManagedDestinationBySlug,
  fetchManagedDestinations
} from '../../utils/destinationApi';
import { allDestinations } from '../../data/destinations';
import { requestUserLocation } from '../../utils/geolocation';
import {
  DEFAULT_DESTINATION_FILTER_CONFIG,
  DESTINATION_CATEGORY_OPTIONS
} from '../../data/destinationFilterConfig';
import useFavoriteDestinations from '../../hooks/useFavoriteDestinations';

const capitalizeFirstLetter = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const DestinationsTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const { slug = 'reiek-tlang' } = useParams<{ slug: string }>();
  const [showFolklorePanel, setShowFolklorePanel] = useState<boolean>(false);
  const [destination, setDestination] = useState<ManagedDestinationRecord | null>(null);
  const [allManagedDestinations, setAllManagedDestinations] = useState<ManagedDestinationRecord[]>([]);
  const [destinationFilterConfig, setDestinationFilterConfig] = useState<DestinationFilterConfig>(DEFAULT_DESTINATION_FILTER_CONFIG);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedGroupFilters, setSelectedGroupFilters] = useState<ActiveFilters>({});
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState<boolean>(true);
  const [distanceLabel, setDistanceLabel] = useState<string>('Unknown');
  const { isFavorite, toggleFavorite } = useFavoriteDestinations();

  const fallbackDestination = useMemo(
    () => allDestinations.find((item) => item.id === slug) || null,
    [slug]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slug]);

  useEffect(() => {
    let isCancelled = false;

    const loadDestination = async () => {
      try {
        const record = await fetchManagedDestinationBySlug(slug);
        if (isCancelled) {
          return;
        }

        setDestination(record);
        if (record.distance_km) {
          setDistanceLabel(`${record.distance_km} km`);
        } else {
          setDistanceLabel(record.travel_time);
        }

        requestUserLocation({
          timeout: 3500,
          enableHighAccuracy: false,
          maximumAge: 5 * 60 * 1000
        })
          .then(async (location) => {
            const localizedRecord = await fetchManagedDestinationBySlug(slug, {
              lat: location.lat,
              lng: location.lng
            });

            if (isCancelled) {
              return;
            }

            setDestination(localizedRecord);
            if (localizedRecord.distance_km) {
              setDistanceLabel(`${localizedRecord.distance_km} km`);
            } else {
              setDistanceLabel(localizedRecord.travel_time);
            }
          })
          .catch(() => {
            // Ignore location errors; base destination data is already displayed.
          });
      } catch {
        if (!isCancelled) {
          setDestination(null);
        }
      }
    };

    void loadDestination();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let isCancelled = false;

    const loadDiscoveryData = async () => {
      setIsDiscoveryLoading(true);
      try {
        const [records, config] = await Promise.all([
          fetchManagedDestinations(),
          fetchDestinationFilterConfig()
        ]);

        if (isCancelled) {
          return;
        }

        setAllManagedDestinations(records);
        setDestinationFilterConfig(config);
      } catch {
        if (isCancelled) {
          return;
        }

        setAllManagedDestinations([]);
        setDestinationFilterConfig(DEFAULT_DESTINATION_FILTER_CONFIG);
      } finally {
        if (!isCancelled) {
          setIsDiscoveryLoading(false);
        }
      }
    };

    void loadDiscoveryData();

    return () => {
      isCancelled = true;
    };
  }, []);

  const highlightChips = useMemo(() => {
    if (!destination) {
      if (!fallbackDestination) {
        return ['Hiking', 'Scenic Views', 'Nature'];
      }

      return fallbackDestination.activityType.slice(0, 8);
    }

    return [
      ...destination.keyword_tags,
      ...destination.activity_type
    ].slice(0, 8);
  }, [destination]);

  const destinationCategory = destination?.destination_type || fallbackDestination?.type || 'nature';
  const isFoodCategory = destinationCategory === 'restaurant' || destinationCategory === 'cafe';
  const isHeritageCategory = destinationCategory === 'heritage' || destinationCategory === 'culture';

  const aboutTitle = isFoodCategory
    ? 'About this place'
    : isHeritageCategory
      ? 'About this heritage site'
      : 'About this destination';

  const quickInfo = useMemo(() => {
    if (!destination) {
      if (fallbackDestination) {
        return [
          { label: 'Distance', value: fallbackDestination.time, icon: 'route' },
          { label: isFoodCategory ? 'Open / Best Time' : 'Best Time', value: fallbackDestination.bestSeason.join(', '), icon: 'calendar' },
          { label: isFoodCategory ? 'Avg Cost' : 'Duration', value: fallbackDestination.duration, icon: 'payments' },
          { label: isFoodCategory ? 'Food Theme' : 'Difficulty', value: isFoodCategory ? (fallbackDestination.activityType[0] || 'Local cuisine') : capitalizeFirstLetter(fallbackDestination.difficulty), icon: 'fitness' }
        ];
      }

      return [
        { label: 'Distance', value: distanceLabel, icon: 'route' },
        { label: 'Best Time', value: 'N/A', icon: 'calendar' },
        { label: 'Entry', value: 'N/A', icon: 'payments' },
        { label: 'Difficulty', value: 'N/A', icon: 'fitness' }
      ];
    }

    return [
      { label: 'Distance', value: distanceLabel, icon: 'route' },
      { label: isFoodCategory ? 'Open / Best Time' : 'Best Time', value: destination.best_time || 'All year', icon: 'calendar' },
      { label: isFoodCategory ? 'Avg Cost' : 'Entry', value: destination.entry_price || 'Free', icon: 'payments' },
      { label: isFoodCategory ? 'Food Theme' : 'Difficulty', value: isFoodCategory ? ((destination.keyword_tags[0] || destination.activity_type[0]) || 'Local cuisine') : capitalizeFirstLetter(destination.difficulty), icon: 'fitness' }
    ];
  }, [destination, distanceLabel, fallbackDestination, isFoodCategory]);

  const hasFolkloreStories = (destination?.folklore_stories?.length ?? 0) > 0;

  const selectedCategoryLabel = useMemo(
    () => DESTINATION_CATEGORY_OPTIONS.find((option) => option.value === selectedCategory)?.label || selectedCategory,
    [selectedCategory]
  );

  const scopedFilterGroups = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return destinationFilterConfig.categories.filter((group) => {
      const appliesTo = group.appliesToCategories || [];
      return appliesTo.length === 0 || appliesTo.includes(selectedCategory);
    });
  }, [destinationFilterConfig, selectedCategory]);

  const matchingDestinations = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    const candidates = allManagedDestinations.filter((item) => item.slug !== slug && item.destination_type === selectedCategory);
    if (Object.keys(selectedGroupFilters).length === 0) {
      return candidates.slice(0, 6);
    }

    return candidates
      .filter((item) => {
        for (const group of scopedFilterGroups) {
          const selectedValues = selectedGroupFilters[group.key] || [];
          if (selectedValues.length === 0) {
            continue;
          }

          const itemFilterTags = item.destination_filter_tags || [];
          const hasMatch = selectedValues.some((value) => itemFilterTags.includes(value));
          if (!hasMatch) {
            return false;
          }
        }

        return true;
      })
      .slice(0, 6);
  }, [allManagedDestinations, scopedFilterGroups, selectedCategory, selectedGroupFilters, slug]);

  const handleCategorySelect = (nextCategory: string) => {
    setSelectedCategory(nextCategory);
    setSelectedGroupFilters({});
  };

  const toggleGroupFilter = (groupKey: string, optionValue: string) => {
    setSelectedGroupFilters((previous) => {
      const groupValues = previous[groupKey] || [];
      const isSelected = groupValues.includes(optionValue);
      return {
        ...previous,
        [groupKey]: isSelected
          ? groupValues.filter((value) => value !== optionValue)
          : [...groupValues, optionValue]
      };
    });
  };

  const clearSelectedFilters = () => {
    setSelectedGroupFilters({});
  };

  const handleToggleFavorite = (destinationId: string) => {
    const result = toggleFavorite(destinationId);
    if (!result.ok && result.reason === 'AUTH_REQUIRED') {
      navigate('/profile');
    }
  };

  return (
    <Screen className="destinations-template-screen">
      <button type="button" className="template-back-btn" onClick={() => navigate('/destinations-gallery')}>
        ← Back to Explore
      </button>

      <section className="template-hero">
        <ProgressiveImage
          src={destination?.header_image_url || fallbackDestination?.image || '/reiek tlang.jpg'}
          variants={destination?.header_image_variants || null}
          alt={destination?.title || fallbackDestination?.name || 'Destination hero'}
          loading="eager"
          fetchPriority="high"
        />
        <div className="template-hero-overlay" />
        <div className="template-hero-copy">
          <h1>{destination?.title || fallbackDestination?.name || 'Destination'}</h1>
          <p>{destination?.subtitle || destination?.short_description || fallbackDestination?.short || 'Custom destination content'}</p>
        </div>
      </section>

      <section className="template-chip-row">
        {highlightChips.map((chip) => (
          <span key={chip} className="template-chip">{chip}</span>
        ))}
      </section>

      <section className="template-discovery-section">
        <div className="template-discovery-head">
          <h3>Explore by Filters</h3>
          <p>{selectedCategory ? `Browsing: ${selectedCategoryLabel}` : 'Pick a category below to discover more places'}</p>
        </div>

        {/* ── Category pill row (always visible) ── */}
        <div className="template-discovery-category-row">
          {DESTINATION_CATEGORY_OPTIONS.map((category) => (
            <button
              key={category.value}
              type="button"
              className={`template-discovery-category-btn ${selectedCategory === category.value ? 'active' : ''}`}
              onClick={() =>
                selectedCategory === category.value
                  ? handleCategorySelect('')   // tap again to deselect
                  : handleCategorySelect(category.value)
              }
            >
              {selectedCategory === category.value && <span className="tdcb-check" aria-hidden="true">✓ </span>}
              {category.label}
            </button>
          ))}
        </div>

        {/* ── Animated filter-group panel (slides down after category chosen) ── */}
        <div className={`template-discovery-filter-panel ${selectedCategory ? 'open' : ''}`}>
          {/* Active filter summary bar */}
          {Object.values(selectedGroupFilters).some((v) => v.length > 0) && (
            <div className="template-discovery-active-bar">
              <span className="tdab-label">Applied:</span>
              <div className="tdab-chips">
                {scopedFilterGroups.map((group) =>
                  (selectedGroupFilters[group.key] || []).map((val) => {
                    const opt = group.options.find((o) => o.value === val);
                    return (
                      <button
                        key={`${group.key}-${val}`}
                        type="button"
                        className="tdab-chip"
                        onClick={() => toggleGroupFilter(group.key, val)}
                        aria-label={`Remove ${opt?.label ?? val}`}
                      >
                        {opt?.label ?? val} <span aria-hidden="true">×</span>
                      </button>
                    );
                  })
                )}
              </div>
              <button type="button" className="tdab-clear" onClick={clearSelectedFilters}>
                Clear all
              </button>
            </div>
          )}

          {/* Filter group cards */}
          {scopedFilterGroups.length > 0 ? (
            <div className="template-discovery-groups">
              {scopedFilterGroups.map((group) => (
                <section key={group.key} className="template-discovery-group-card">
                  <h4>{group.title}</h4>
                  <div className="template-discovery-options">
                    {group.options.map((option) => {
                      const isSelected = (selectedGroupFilters[group.key] || []).includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`template-discovery-option-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => toggleGroupFilter(group.key, option.value)}
                        >
                          <span>{option.label}</span>
                          {option.bracketText ? <small>({option.bracketText})</small> : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="template-discovery-hint" style={{ marginTop: 4 }}>No sub-filters for this category.</p>
          )}

          {/* Results */}
          <div className="template-discovery-results-head">
            <h4>
              {isDiscoveryLoading ? 'Loading…' : `${matchingDestinations.length} place${matchingDestinations.length !== 1 ? 's' : ''} found`}
            </h4>
          </div>

          {isDiscoveryLoading ? (
            <div className="template-discovery-skeleton-grid">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="template-discovery-skeleton-card" />
              ))}
            </div>
          ) : matchingDestinations.length > 0 ? (
            <div className="template-discovery-results-grid">
              {matchingDestinations.map((item) => (
                <article key={item.slug} className="template-discovery-result-card">
                  <strong>{item.title}</strong>
                  <span>{item.short_description}</span>
                  <div className="template-discovery-result-actions">
                    <button
                      type="button"
                      className="template-discovery-open-btn"
                      onClick={() => navigate(`/destinations-template/${item.slug}`)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className={`favorite-icon-btn ${isFavorite(item.slug) ? 'active' : ''}`}
                      onClick={() => handleToggleFavorite(item.slug)}
                      aria-label={isFavorite(item.slug) ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
                    >
                      ❤
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="template-discovery-hint">No places match your current filters.</p>
          )}
        </div>
      </section>

      <section className="template-about-card">
        <h2>{destination?.title || fallbackDestination?.name || aboutTitle}</h2>
        <p>{destination?.about || fallbackDestination?.detail || 'No description has been published yet.'}</p>
      </section>

      <section className="template-info-grid">
        {quickInfo.map((item) => (
          <article key={item.label} className="template-info-card">
            <span className="template-info-icon" aria-hidden="true">{item.icon}</span>
            <span className="template-info-label">{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="template-gallery-section">
        <div className="template-gallery-head">
          <h3>Gallery</h3>
          <button type="button">See all</button>
        </div>
        <div className="template-gallery-row">
          {(destination?.gallery_images || []).map((item, index) => (
            <article key={`${item.image_url}-${index}`} className="template-gallery-card">
              <div className="template-gallery-image-wrap">
                <ProgressiveImage
                  src={item.image_url}
                  variants={item.image_variants || null}
                  alt={item.caption || `Gallery image ${index + 1}`}
                />
              </div>
              <p>{item.caption || 'Viewpoint'}</p>
            </article>
          ))}
          {destination?.gallery_images?.length ? null : fallbackDestination ? (
            <article className="template-gallery-card">
              <div className="template-gallery-image-wrap">
                <img src={fallbackDestination.image} alt={fallbackDestination.name} width={640} height={360} loading="lazy" decoding="async" />
              </div>
              <p>{fallbackDestination.name}</p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="template-road-card">
        <div>
          <h3>{isFoodCategory ? 'How to Reach' : 'Road Condition'}</h3>
          <p>
            {isFoodCategory
              ? (destination?.travel_time || fallbackDestination?.time || 'Distance shown from your location')
              : `Status: ${destination?.road_condition_status ? capitalizeFirstLetter(destination.road_condition_status) : 'Unknown'}`}
          </p>
        </div>
        <span aria-hidden="true">{isFoodCategory ? 'place' : 'car'}</span>
      </section>

      {hasFolkloreStories && (
        <section className="template-story-card">
          <h3>Mizo Folklore and Stories</h3>
          <p>Discover local legends, oral traditions, and cultural memory tied to this place.</p>
          <button type="button" className="primary-btn" onClick={() => setShowFolklorePanel(true)}>
            Read Story
          </button>
        </section>
      )}

      <footer className="screen-footer">
        <img src="/icons/lushai-tech.svg" alt="LushAiTech" width="121" height="32" loading="lazy" decoding="async" />
      </footer>

      {showFolklorePanel && (
        <FolkloreTemplatePage
          onClose={() => setShowFolklorePanel(false)}
          stories={destination?.folklore_stories}
          destinationTitle={destination?.title}
          headerImageUrl={destination?.header_image_url}
          headerImageVariants={destination?.header_image_variants}
        />
      )}
    </Screen>
  );
};

export default DestinationsTemplatePage;