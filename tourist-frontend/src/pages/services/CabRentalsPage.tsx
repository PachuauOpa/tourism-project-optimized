import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';

const CabRentalsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>Cab Rentals</h2>
      </div>

      <article className="text-panel">
        <p>Book cabs for airport pickup, inter-district travel, hill road tours and day trips.</p>
        <button type="button" className="primary-btn" onClick={() => navigate('/profile')}>
          Continue Booking
        </button>
      </article>
    </Screen>
  );
};

export default CabRentalsPage;
