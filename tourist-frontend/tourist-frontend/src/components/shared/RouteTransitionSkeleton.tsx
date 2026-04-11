import React from 'react';

type SkeletonVariant = 'home' | 'listing' | 'detail' | 'form' | 'dashboard' | 'minimal';

interface RouteTransitionSkeletonProps {
  variant: SkeletonVariant;
}

const renderRows = (count: number, keyPrefix: string, className: string) => (
  Array.from({ length: count }).map((_, index) => (
    <div key={`${keyPrefix}-${index}`} className={className} />
  ))
);

const RouteTransitionSkeleton: React.FC<RouteTransitionSkeletonProps> = ({ variant }) => {
  if (variant === 'dashboard') {
    return (
      <main className="route-skeleton route-skeleton-dashboard" aria-hidden="true">
        <div className="route-skeleton-top" />
        <div className="route-skeleton-grid route-skeleton-grid-4">
          {renderRows(4, 'metric', 'route-skeleton-card route-skeleton-card-tall')}
        </div>
        <div className="route-skeleton-grid route-skeleton-grid-2">
          {renderRows(2, 'panel', 'route-skeleton-card route-skeleton-card-lg')}
        </div>
      </main>
    );
  }

  if (variant === 'form') {
    return (
      <main className="route-skeleton" aria-hidden="true">
        <div className="route-skeleton-top" />
        <div className="route-skeleton-form">
          {renderRows(8, 'input', 'route-skeleton-input')}
        </div>
        <div className="route-skeleton-cta" />
      </main>
    );
  }

  if (variant === 'detail') {
    return (
      <main className="route-skeleton" aria-hidden="true">
        <div className="route-skeleton-hero" />
        <div className="route-skeleton-section-title" />
        <div className="route-skeleton-grid route-skeleton-grid-2">
          {renderRows(4, 'detail-card', 'route-skeleton-card')}
        </div>
      </main>
    );
  }

  if (variant === 'listing') {
    return (
      <main className="route-skeleton" aria-hidden="true">
        <div className="route-skeleton-top" />
        <div className="route-skeleton-grid route-skeleton-grid-3">
          {renderRows(6, 'list-card', 'route-skeleton-card')}
        </div>
      </main>
    );
  }

  if (variant === 'home') {
    return (
      <main className="route-skeleton" aria-hidden="true">
        <div className="route-skeleton-top" />
        <div className="route-skeleton-hero" />
        <div className="route-skeleton-row">
          {renderRows(4, 'chip', 'route-skeleton-chip')}
        </div>
        <div className="route-skeleton-grid route-skeleton-grid-2">
          {renderRows(4, 'home-card', 'route-skeleton-card')}
        </div>
      </main>
    );
  }

  return (
    <main className="route-skeleton route-skeleton-minimal" aria-hidden="true">
      <div className="route-skeleton-top" />
      <div className="route-skeleton-card route-skeleton-card-lg" />
    </main>
  );
};

export type { SkeletonVariant };
export default RouteTransitionSkeleton;
