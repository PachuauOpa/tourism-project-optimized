import React from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '../components/shared/Screen';

const PlannerPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Screen className="plain-screen">
      <div className="page-head">
        <button type="button" onClick={() => navigate('/home')}>Back</button>
        <h2>AI Planner</h2>
      </div>

      <article className="text-panel">
        <p>Enter your stay duration and interests. The planner can generate route-ready suggestions for hill travel.</p>
        <div className="field-stack">
          <input placeholder="How many days?" />
          <input placeholder="Interests: nature, food, history" />
          <button type="button" className="primary-btn">Create Itinerary</button>
        </div>
      </article>
    </Screen>
  );
};

export default PlannerPage;
