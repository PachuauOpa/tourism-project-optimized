import React from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../../components/shared/Screen';
import { featuredDestinations } from '../../data/destinations';

const DestinationListPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>Featured Destinations</h2>
      </div>

      <div className="list-stack">
        {featuredDestinations.map((destination) => (
          <article className="info-card" key={destination.id}>
            <img src={destination.image} alt={destination.name} />
            <h3>{destination.name}</h3>
            <p>{destination.detail}</p>
            <button type="button" className="row-btn" onClick={() => navigate(`/destinations-template/${destination.id}`)}>
              View Destination
              <img src="/icons/Arrow - Right.png" alt="Open" />
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
