import React from 'react';
import { useNavigate } from 'react-router-dom';

export const HeaderLogo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="brand-wrap">
      <div className="brand-logo-row" aria-label="Tourism Project">
        <img
          src="/icons/title-mark.svg"
          alt="Tourism"
          className="brand-logo-mark"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        />
        <div className="brand-logo-text" aria-hidden="true">
          <span>TOURISM</span>
          <span>PROJECT</span>
        </div>
      </div>
      <p className="brand-tagline">Your gateway to Mizoram</p>
    </div>
  );
};

export default HeaderLogo;
