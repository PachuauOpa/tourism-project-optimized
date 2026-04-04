import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/* ---------------------------------------------------------------
   AppNav — renders as:
   • Desktop (≥992px): Fixed left sidebar with brand + nav links
   • Mobile (<992px):  Fixed bottom pill navigation (existing design)
--------------------------------------------------------------- */

interface NavItem {
  to: string;
  label: string;
  icon: string;
  activeIcon?: string;
  activeCondition?: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/home',
    label: 'Home',
    icon: '/icons/nav-home.svg',
    activeCondition: (p) => p === '/home',
  },
  {
    to: '/destinations-gallery',
    label: 'Explore',
    icon: '/icons/nav-explore.svg',
    activeCondition: (p) => p === '/destinations-gallery' || p === '/destinations',
  },
  {
    to: '/ilp',
    label: 'ILP',
    icon: '/icons/nav-passport.svg',
    activeCondition: (p) => p.startsWith('/ilp') || p.startsWith('/temporary-stay') || p.startsWith('/ilp-exemption'),
  },
  {
    to: '/registration',
    label: 'Profile',
    icon: '/icons/nav-profile.svg',
    activeCondition: (p) => p === '/registration',
  },
];

// ───────────────────────────────────────────────
// Desktop Sidebar
// ───────────────────────────────────────────────
const DesktopSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`desktop-sidebar ${collapsed ? 'desktop-sidebar--collapsed' : ''}`}
      aria-label="Main Navigation"
    >
      {/* Brand */}
      <div className="sidebar-brand" onClick={() => navigate('/home')} role="button" tabIndex={0} aria-label="Go home">
        <img src="/icons/title-mark.svg" alt="Tourism Project" className="sidebar-brand-mark" />
        {!collapsed && (
          <div className="sidebar-brand-text" aria-hidden="true">
            <span>TOURISM</span>
            <span>PROJECT</span>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav" aria-label="Site navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = item.activeCondition
            ? item.activeCondition(location.pathname)
            : location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-nav-link ${isActive ? 'sidebar-nav-link--active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon">
                <img src={item.icon} alt={item.label} />
              </span>
              {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="sidebar-collapse-icon">{collapsed ? '›' : '‹'}</span>
        {!collapsed && <span className="sidebar-collapse-label">Collapse</span>}
      </button>

      {/* Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <img src="/icons/lushai-tech.svg" alt="LushAI Tech" />
        </div>
      )}
    </aside>
  );
};

// ───────────────────────────────────────────────
// Mobile Bottom Nav (existing design, preserved)
// ───────────────────────────────────────────────
const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.activeCondition
          ? item.activeCondition(location.pathname)
          : location.pathname === item.to;

        if (item.to === '/ilp') {
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${isActive ? 'active' : ''}`}
              aria-label={item.label}
            >
              <img src={item.icon} alt={item.label} />
            </Link>
          );
        }

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-link ${isActive ? 'active' : ''}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <img src={item.icon} alt={item.label} />
          </Link>
        );
      })}
    </nav>
  );
};

// ───────────────────────────────────────────────
// Combined AppNav — uses CSS to show correct nav per breakpoint
// ───────────────────────────────────────────────
export const AppNav: React.FC = () => {
  return (
    <>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <div className="desktop-nav-wrapper">
        <DesktopSidebar />
      </div>
      {/* Mobile bottom nav — hidden on desktop via CSS */}
      <div className="mobile-nav-wrapper">
        <MobileBottomNav />
      </div>
    </>
  );
};

export default AppNav;
