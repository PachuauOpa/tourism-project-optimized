import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../../components/shared/Screen';

const ExperiencesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>Experiences</h2>
      </div>

      <article className="text-panel">
        <p>Access guided cultural programs, trekking modules and curated local craft workshops.</p>
        <button type="button" className="primary-btn" onClick={() => navigate('/registration')}>
          Continue Booking
        </button>
      </article>
    </Screen>
  );
};

export default ExperiencesPage;
