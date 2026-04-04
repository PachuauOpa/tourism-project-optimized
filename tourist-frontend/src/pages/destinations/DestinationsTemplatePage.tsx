import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Screen from '../../components/shared/Screen';
import FolkloreTemplatePage from './FolkloreTemplatePage';
import ProgressiveImage from '../../components/shared/ProgressiveImage';
import { ManagedDestinationRecord } from '../../types';
import { fetchManagedDestinationBySlug } from '../../utils/destinationApi';
import { allDestinations } from '../../data/destinations';

const capitalizeFirstLetter = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const DestinationsTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const { slug = 'reiek-tlang' } = useParams<{ slug: string }>();
  const [showFolklorePanel, setShowFolklorePanel] = useState<boolean>(false);
  const [destination, setDestination] = useState<ManagedDestinationRecord | null>(null);
  const [distanceLabel, setDistanceLabel] = useState<string>('Unknown');

  const fallbackDestination = useMemo(
    () => allDestinations.find((item) => item.id === slug) || null,
    [slug]
  );

  useLayoutEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToTop();
    const frameId = window.requestAnimationFrame(scrollToTop);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
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

        if (!('geolocation' in navigator)) {
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const localizedRecord = await fetchManagedDestinationBySlug(slug, {
                lat: position.coords.latitude,
                lng: position.coords.longitude
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
            } catch {
              // Keep already-loaded destination data if location refresh fails.
            }
          },
          () => {
            // Ignore location errors; base destination data is already displayed.
          },
          {
            timeout: 4000,
            maximumAge: 300000
          }
        );
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
                <img src={fallbackDestination.image} alt={fallbackDestination.name} />
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
        <img src="/icons/lushai-tech.svg" alt="LushAiTech" />
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