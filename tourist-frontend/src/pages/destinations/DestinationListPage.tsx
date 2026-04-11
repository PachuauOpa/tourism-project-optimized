import React from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../../components/shared/Screen';
import { featuredDestinations } from '../../data/destinations';
import useFavoriteDestinations from '../../hooks/useFavoriteDestinations';

const DestinationListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavoriteDestinations();

  const handleToggleFavorite = (destinationId: string) => {
    const result = toggleFavorite(destinationId);
    if (!result.ok && result.reason === 'AUTH_REQUIRED') {
      navigate('/profile');
    }
  };

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>Featured Destinations</h2>
      </div>

      <div className="list-stack">
        {featuredDestinations.map((destination) => (
          <article className="info-card" key={destination.id}>
            <img src={destination.image} alt={destination.name} width={640} height={360} loading="lazy" decoding="async" />
            <h3>{destination.name}</h3>
            <p>{destination.detail}</p>
            <button
              type="button"
              className={`favorite-pill-btn ${isFavorite(destination.id) ? 'active' : ''}`}
              onClick={() => handleToggleFavorite(destination.id)}
            >
              {isFavorite(destination.id) ? '❤ Saved' : '❤ Favorite'}
            </button>
            <button type="button" className="row-btn" onClick={() => navigate(`/destinations-template/${destination.id}`)}>
              View Destination
              <img src="/icons/Arrow - Right.png" alt="Open" width="16" height="16" />
            </button>
          </article>
        ))}
        <button
          type="button"
          className="primary-btn"
          onClick={() => navigate('/destinations-gallery')}
          style={{ marginTop: '20px' }}
        >
          View All Destinations
        </button>
      </div>
    </Screen>
  );
};

export default DestinationListPage;
