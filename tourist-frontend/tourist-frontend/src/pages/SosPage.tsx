import React from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../components/shared/Screen';

const SosPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>24/7 SOS</h2>
      </div>

      <article className="text-panel danger-panel">
        <p>Contact emergency dispatch and share your live location with support teams.</p>
        <div className="sos-actions">
          <button type="button">Call 112</button>
          <button type="button">Share Location</button>
          <button type="button">Notify Travel Contact</button>
        </div>
      </article>
    </Screen>
  );
};

export default SosPage;
