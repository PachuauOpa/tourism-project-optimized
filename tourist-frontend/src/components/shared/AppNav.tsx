import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

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

const DesktopNav: React.FC<{ activeIndex: number; theme: string; toggleTheme: () => void; navigate: ReturnType<typeof useNavigate> }> = ({ activeIndex, theme, toggleTheme, navigate }) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-line dark:border-gray-800 shadow-sm" aria-label="Main Navigation">
      {/* Brand */}
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => navigate('/home')} 
        role="button" 
        tabIndex={0} 
        aria-label="Go home"
      >
        <img src="/icons/title-mark.svg" alt="Tourism Project" className="w-[30px] h-auto" width="30" height="auto" />
        <div className="flex flex-col font-bold leading-none tracking-tight text-ink dark:text-white" aria-hidden="true" style={{ fontSize: '18px' }}>
          <span>TOURISM</span>
          <span>PROJECT</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex items-center gap-6" aria-label="Site navigation">
        {NAV_ITEMS.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' 
                  : 'text-muted dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <img 
                src={item.icon} 
                alt={item.label} 
                width="20" 
                height="20" 
                style={{ filter: isActive ? 'none' : 'grayscale(100%) opacity(70%)' }}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="admin-theme-toggle flex items-center justify-center p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition text-ink dark:text-white"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        ) : (
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        )}
      </button>
    </header>
  );
};

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
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const activeIndex = getActiveNavIndex(location.pathname);

  return (
    <>
      <div className="hidden md:block">
        <DesktopNav activeIndex={activeIndex} theme={theme} toggleTheme={toggleTheme} navigate={navigate} />
      </div>
      <div className="block md:hidden">
        <MobileBottomNav activeIndex={activeIndex} />
      </div>
    </>
  );
};

export default AppNav;