import React from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../components/shared/Screen';

const FiltersPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>Travel Filters</h2>
      </div>
      <div className="list-stack">
        {['Nature', 'Culture', 'Family Friendly', 'Adventure', 'Road Trip', 'Waterfall'].map((item) => (
          <button key={item} type="button" className="chip-item">
            {item}
          </button>
        ))}
      </div>
    </Screen>
  );
};

export default FiltersPage;
