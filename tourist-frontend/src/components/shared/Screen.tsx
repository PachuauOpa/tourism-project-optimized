import React from 'react';
import { motion as Motion } from 'framer-motion';
import { pageMotion } from '../../data/animations';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
}

type NativeMainProps = Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'className'>;

export const Screen: React.FC<ScreenProps & NativeMainProps> = ({ children, className = '', ...restProps }) => {
  return (
    <Motion.main className={`screen ${className}`.trim()} {...pageMotion} {...restProps}>
      {children}
    </Motion.main>
  );
};

export default Screen;
