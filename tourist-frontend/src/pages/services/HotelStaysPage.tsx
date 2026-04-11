import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';

const HotelStaysPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>Hotel Stays</h2>
      </div>

      <article className="text-panel">
        <p>Compare hotels and homestays with verified amenities, district-wise pricing and map support.</p>
        <button type="button" className="primary-btn" onClick={() => navigate('/profile')}>
          Continue Booking
        </button>
      </article>
    </Screen>
  );
};

export default HotelStaysPage;
