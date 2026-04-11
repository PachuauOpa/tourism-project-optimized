import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Screen from '../../components/shared/Screen';
import ProgressiveImage from '../../components/shared/ProgressiveImage';
import { DestinationFolkloreStory, ImageVariantUrls, ManagedDestinationRecord } from '../../types';
import { fetchManagedDestinationBySlug } from '../../utils/destinationApi';

interface FolkloreTemplatePageProps {
  onClose?: () => void;
  stories?: DestinationFolkloreStory[];
  destinationTitle?: string;
  headerImageUrl?: string | null;
  headerImageVariants?: ImageVariantUrls | null;
}

const FolkloreTemplatePage: React.FC<FolkloreTemplatePageProps> = ({
  onClose,
  stories,
  destinationTitle,
  headerImageUrl,
  headerImageVariants
}) => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [isFullScreenLocked, setIsFullScreenLocked] = useState<boolean>(false);
  const [record, setRecord] = useState<ManagedDestinationRecord | null>(null);

  useEffect(() => {
    if (stories && stories.length > 0) {
      return;
    }

    if (!slug) {
      return;
    }

    const loadDestination = async () => {
      try {
        const destination = await fetchManagedDestinationBySlug(slug);
        setRecord(destination);
      } catch {
        setRecord(null);
      }
    };

    void loadDestination();
  }, [slug, stories]);

  const activeStories = useMemo(() => {
    if (stories && stories.length > 0) {
      return stories;
    }

    return record?.folklore_stories || [];
  }, [record, stories]);

  const heroImage = headerImageUrl || record?.header_image_url || '/reiek tlang.jpg';
  const heroImageVariants = headerImageVariants || record?.header_image_variants || null;
  const heading = destinationTitle || record?.title || 'Folklore & Stories';
  const primaryStory = activeStories[0];
  const recommendedStories = activeStories.slice(1);

  const handleClose = (): void => {
    if (onClose) {
      onClose();
      return;
    }

    if (slug) {
      navigate(`/destinations-template/${slug}`);
      return;
    }

    navigate('/destinations-template');
  };

  const handlePanelScroll = (event: React.UIEvent<HTMLElement>): void => {
    if (isFullScreenLocked) {
      return;
    }

    if (event.currentTarget.scrollTop > 56) {
      setIsFullScreenLocked(true);
    }
  };

  return (
    <div className="folklore-panel-overlay" aria-hidden="true" onClick={handleClose}>
      <Screen
        className={`folklore-template-screen ${isFullScreenLocked ? 'folklore-template-screen-full' : ''}`}
        onScroll={handlePanelScroll}
        onClick={(event) => event.stopPropagation()}
      >
      <header className="folklore-topbar">
        <div className="folklore-topbar-left">
          <button
            type="button"
            className="folklore-icon-btn"
            onClick={handleClose}
            aria-label="Back to destination"
          >
            ←
          </button>
          <h1>{heading}</h1>
        </div>
        <div className="folklore-topbar-actions">
          <button type="button" className="folklore-icon-btn" aria-label="Share story">↗</button>
          <button type="button" className="folklore-icon-btn" aria-label="Save story">★</button>
        </div>
      </header>

      <section className="folklore-hero">
        <ProgressiveImage src={heroImage} variants={heroImageVariants} alt={heading} />
        <div className="folklore-hero-overlay" />
        <div className="folklore-hero-copy">
          <div className="folklore-meta">
            <span className="folklore-pill">Legend</span>
            <span className="folklore-read-time">{Math.max(2, Math.ceil((primaryStory?.body?.length || 300) / 700))} min read</span>
          </div>
          <h2>{primaryStory?.title || 'No story available yet'}</h2>
        </div>
      </section>

      <article className="folklore-content">
        {primaryStory ? (
          <>
            <p className="folklore-quote">"{primaryStory.title}"</p>
            <div className="folklore-story-dropcap">
              {primaryStory.body.split('\n').filter(Boolean).map((paragraph, index) => (
                <p key={`p-${index}`}>{paragraph}</p>
              ))}
            </div>

            {primaryStory.image_url ? (
              <div className="folklore-story-image-wrap">
                <ProgressiveImage
                  src={primaryStory.image_url}
                  variants={primaryStory.image_variants || null}
                  alt={primaryStory.title}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p className="folklore-paragraph">No folklore has been published for this destination yet.</p>
        )}

        <section className="folklore-interaction-card">
          <h3>Preserve the Legend</h3>
          <p>Stories like these are the heartbeat of the mountains. Share this narrative.</p>
          <div className="folklore-interaction-actions">
            <button type="button" className="primary-btn">Share Story</button>
            <button type="button" className="folklore-secondary-btn">Offline Read</button>
          </div>
        </section>
      </article>

      {recommendedStories.length > 0 ? (
        <section className="folklore-recommended">
          <h4>More Folklore</h4>
          <div className="folklore-recommended-row">
            {recommendedStories.map((story) => (
              <article key={story.title} className="folklore-recommended-card">
                {story.image_url ? (
                  <ProgressiveImage
                    src={story.image_url}
                    variants={story.image_variants || null}
                    alt={story.title}
                  />
                ) : null}
                <h5>{story.title}</h5>
                <p>{Math.max(2, Math.ceil((story.body.length || 200) / 700))} min read</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="screen-footer">
        <img src="/icons/lushai-tech.svg" alt="LushAiTech" />
      </footer>

      </Screen>
    </div>
  );
};

export default FolkloreTemplatePage;
