import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
    activeCondition: (p) => (
      p.startsWith('/destinations') ||
      p.startsWith('/destination/') ||
      p.startsWith('/folklore-template')
    ),
  },
  {
    to: '/ilp',
    label: 'ILP',
    icon: '/icons/nav-passport.svg',
    activeCondition: (p) => p.startsWith('/ilp') || p.startsWith('/temporary-stay') || p.startsWith('/ilp-exemption'),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: '/icons/nav-profile.svg',
    activeCondition: (p) => p === '/profile' || p === '/registration',
  },
];

// Module-level persisted indices — survive re-renders, preserve last position
let desktopLastSelectedIndex = 0;
let mobileLastSelectedIndex = 0;

const getActiveNavIndex = (pathname: string): number => (
  NAV_ITEMS.findIndex((item) => (
    item.activeCondition ? item.activeCondition(pathname) : pathname === item.to
  ))
);

/** Compute the CSS highlight position from a link element and its nav container. */
const computeDesktopHighlight = (
  linkEl: HTMLAnchorElement | null,
): React.CSSProperties => {
  if (!linkEl) return {};
  return {
    transform: `translate3d(${linkEl.offsetLeft}px, ${linkEl.offsetTop}px, 0)`,
    width: `${linkEl.offsetWidth}px`,
    height: `${linkEl.offsetHeight}px`,
    willChange: 'transform, width, height',
  };
};

const computeMobileHighlight = (
  linkEl: HTMLAnchorElement | null,
): React.CSSProperties => {
  if (!linkEl) return {};
  return {
    transform: `translate3d(${linkEl.offsetLeft}px, 0, 0)`,
    width: `${linkEl.offsetWidth}px`,
    height: `${linkEl.offsetHeight}px`,
    willChange: 'transform, width',
  };
};

// ───────────────────────────────────────────────
// Desktop Sidebar
// ───────────────────────────────────────────────
const DesktopSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const activeIndex = getActiveNavIndex(location.pathname);

  // highlightIndex tracks the visually highlighted item — persists across nav to avoid flash
  const [highlightIndex, setHighlightIndex] = useState<number>(() => {
    const idx = activeIndex >= 0 ? activeIndex : desktopLastSelectedIndex;
    return idx;
  });

  const effectiveActiveIndex = activeIndex >= 0 ? activeIndex : highlightIndex;

  // Compute style directly from DOM without async delay
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  const updateHighlight = useCallback((index: number = highlightIndex) => {
    const activeLink = linkRefs.current[index] ?? null;
    if (!activeLink) return;
    setHighlightStyle(computeDesktopHighlight(activeLink));
  }, [highlightIndex]);

  // Sync index immediately (no rAF) so highlight moves the same frame the route changes
  useLayoutEffect(() => {
    if (activeIndex >= 0 && activeIndex !== highlightIndex) {
      setHighlightIndex(activeIndex);
      desktopLastSelectedIndex = activeIndex;
    }
  }, [activeIndex]); // intentionally NOT depending on highlightIndex to avoid loop

  // Recompute position whenever index or collapsed state changes
  useLayoutEffect(() => {
    updateHighlight(highlightIndex);
  }, [highlightIndex, collapsed]);

  // Also update on resize / sidebar dimension changes
  useLayoutEffect(() => {
    const handleResize = () => updateHighlight(highlightIndex);
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateHighlight(highlightIndex));
      if (navRef.current) observer.observe(navRef.current);
      const activeLink = linkRefs.current[highlightIndex];
      if (activeLink) observer.observe(activeLink);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [highlightIndex, updateHighlight]);

  // Persist on unmount
  useEffect(() => () => {
    if (activeIndex >= 0) desktopLastSelectedIndex = activeIndex;
  }, [activeIndex]);

  return (
    <aside
      className={`desktop-sidebar ${collapsed ? 'desktop-sidebar--collapsed' : ''}`}
      aria-label="Main Navigation"
    >
      {/* Brand */}
      <div className="sidebar-brand" onClick={() => navigate('/home')} role="button" tabIndex={0} aria-label="Go home">
        <img src="/icons/title-mark.svg" alt="Tourism Project" className="sidebar-brand-mark" width="38" height="85" />
        {!collapsed && (
          <div className="sidebar-brand-text" aria-hidden="true">
            <span>TOURISM</span>
            <span>PROJECT</span>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav" aria-label="Site navigation" ref={navRef}>
        <span className="sidebar-nav-highlight" style={highlightStyle} aria-hidden="true" />
        {NAV_ITEMS.map((item, index) => {
          const isActive = index === effectiveActiveIndex;

          return (
            <Link
              key={item.to}
              to={item.to}
              ref={(element) => {
                linkRefs.current[index] = element;
              }}
              className={`sidebar-nav-link ${isActive ? 'sidebar-nav-link--active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon">
                <img src={item.icon} alt={item.label} width="20" height="20" />
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
          <img src="/icons/lushai-tech.svg" alt="LushAI Tech" width="121" height="32" loading="lazy" decoding="async" />
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
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const activeIndex = getActiveNavIndex(location.pathname);

  // Initialize from persisted index to avoid flash on mount
  const [highlightIndex, setHighlightIndex] = useState<number>(() => {
    return activeIndex >= 0 ? activeIndex : mobileLastSelectedIndex;
  });

  const effectiveActiveIndex = activeIndex >= 0 ? activeIndex : highlightIndex;

  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  const updateHighlight = useCallback((index: number = highlightIndex) => {
    const activeLink = linkRefs.current[index] ?? null;
    if (!activeLink) return;
    setHighlightStyle(computeMobileHighlight(activeLink));
  }, [highlightIndex]);

  // Sync index immediately (no rAF) — same frame as route change
  useLayoutEffect(() => {
    if (activeIndex >= 0 && activeIndex !== highlightIndex) {
      setHighlightIndex(activeIndex);
      mobileLastSelectedIndex = activeIndex;
    }
  }, [activeIndex]); // intentionally NOT including highlightIndex

  // Recompute position whenever index changes
  useLayoutEffect(() => {
    updateHighlight(highlightIndex);
  }, [highlightIndex]);

  // Handle resize
  useLayoutEffect(() => {
    const handleResize = () => updateHighlight(highlightIndex);
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateHighlight(highlightIndex));
      if (navRef.current) observer.observe(navRef.current);
      const activeLink = linkRefs.current[highlightIndex];
      if (activeLink) observer.observe(activeLink);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [highlightIndex, updateHighlight]);

  // Persist on unmount
  useEffect(() => () => {
    if (activeIndex >= 0) mobileLastSelectedIndex = activeIndex;
  }, [activeIndex]);

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation" ref={navRef}>
      <span className="bottom-nav-highlight" style={highlightStyle} aria-hidden="true" />
      {NAV_ITEMS.map((item, index) => {
        const isActive = index === effectiveActiveIndex;

        return (
          <Link
            key={item.to}
            to={item.to}
            ref={(element) => {
              linkRefs.current[index] = element;
            }}
            className={`nav-link ${isActive ? 'active' : ''}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <img src={item.icon} alt={item.label} width="20" height="20" />
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
