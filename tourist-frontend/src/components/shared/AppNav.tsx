import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/* ---------------------------------------------------------------
   AppNav — renders as:
   • Desktop (≥992px): Fixed top nav with brand + nav links + theme toggle
   • Mobile (<992px):  Fixed bottom pill navigation
--------------------------------------------------------------- */

interface NavItem {
  to: string;
  label: string;
  icon: string;
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

const getActiveNavIndex = (pathname: string): number => (
  NAV_ITEMS.findIndex((item) => (
    item.activeCondition ? item.activeCondition(pathname) : pathname === item.to
  ))
);

const MobileBottomNav: React.FC<{ activeIndex: number }> = ({ activeIndex }) => {
  return (
    <nav className="bottom-nav border-t border-line dark:border-gray-800 bg-white dark:bg-[#131313] fixed bottom-0 w-full flex justify-around items-center h-[72px] z-[100]" aria-label="Mobile navigation">
      {NAV_ITEMS.map((item, index) => {
        const isActive = index === activeIndex;

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-link flex-1 flex justify-center py-3 ${isActive ? 'active' : ''}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className={`p-2 rounded-2xl ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
              <img src={item.icon} alt={item.label} width="24" height="24" style={{ filter: isActive ? 'none' : 'grayscale(100%) opacity(70%)' }} />
            </div>
          </Link>
        );
      })}
    </nav>
  );
};

export const AppNav: React.FC = () => {
  const location = useLocation();

  const activeIndex = getActiveNavIndex(location.pathname);

  return (
    <>
      <div className="block md:hidden">
        <MobileBottomNav activeIndex={activeIndex} />
      </div>
    </>
  );
};

export default AppNav;