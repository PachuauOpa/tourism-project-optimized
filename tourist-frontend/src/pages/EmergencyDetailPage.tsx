import React from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import Screen from '../components/shared/Screen';
import { emergencyLines } from '../data/emergencyLines';

const EmergencyDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const line = emergencyLines.find((item) => item.id === id);

  if (!line) {
    return <Navigate to="/home" replace />;
  }

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>{line.title}</h2>
      </div>
      <article className="text-panel">
        <p>{line.info}</p>
        <button type="button" className="primary-btn" onClick={() => navigate('/sos')}>
          Open SOS
        </button>
      </article>
    </Screen>
  );
};

export default EmergencyDetailPage;
