import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const isExploreActive = location.pathname === '/destinations-gallery' || location.pathname === '/destinations';

  return (
    <nav className="bottom-nav">
      <Link className={location.pathname === '/home' ? 'nav-link active' : 'nav-link'} to="/home" aria-label="Home">
        <img src="/icons/nav-home.svg" alt="Home" />
      </Link>
      <Link className={isExploreActive ? 'nav-link active' : 'nav-link'} to="/destinations-gallery" aria-label="Explore">
        <img src="/icons/nav-explore.svg" alt="Explore" />
      </Link>
      <button className="nav-link" type="button" aria-label="ILP">
        <img src="/icons/nav-passport.svg" alt="ILP" />
      </button>
      <Link className={location.pathname === '/registration' ? 'nav-link active' : 'nav-link'} to="/registration" aria-label="Profile">
        <img src="/icons/nav-profile.svg" alt="Profile" />
      </Link>
    </nav>
  );
};

export default BottomNav;
