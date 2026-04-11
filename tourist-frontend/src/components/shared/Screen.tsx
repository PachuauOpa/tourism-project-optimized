import React from 'react';
import { motion as Motion, HTMLMotionProps, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { pageMotion } from '../../data/animations';
import AppNav from './AppNav';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  /** Pass fullWidth to disable the mobile max-width cap on desktop */
  fullWidth?: boolean;
  /** Pass noNav to suppress navigation (used in admin/ILP admin pages) */
  noNav?: boolean;
}

type NativeMainProps = Omit<HTMLMotionProps<'main'>, 'children' | 'className'>;

export const Screen: React.FC<ScreenProps & NativeMainProps> = ({
  children,
  className = '',
  fullWidth = false,
  noNav = false,
  ...restProps
}) => {
  const shouldReduceMotion = useReducedMotion();
  const location = useLocation();

  return (
    <div className={`app-layout ${noNav ? 'app-layout--no-nav' : ''}`}>
      {!noNav && <AppNav />}

      <Motion.main
        key={location.pathname}
        className={`screen ${fullWidth ? 'screen--full' : ''} ${className}`.trim()}
        {...(shouldReduceMotion ? {} : pageMotion)}
        {...restProps}
      >
        {children}
      </Motion.main>
    </div>
  );
};

export default Screen;
