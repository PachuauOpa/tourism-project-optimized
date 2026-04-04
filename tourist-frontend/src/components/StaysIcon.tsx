import React from 'react';
import { IconProps } from '../types';

const StaysIcon: React.FC<IconProps> = ({ size = 41, className = '' }) => {
  return (
    <svg
      width={size}
      height={size * (34/41)}
      viewBox="0 0 41 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M12.1875 30.7308V9.68462M27.625 30.7308V9.68462M13.375 8.51539V3.83846C13.375 2.54696 14.4383 1.5 15.75 1.5H24.0625C25.3742 1.5 26.4375 2.54697 26.4375 3.83846V8.51539M6.25 31.9H34.75C37.3734 31.9 39.5 29.8061 39.5 27.2231V13.1923C39.5 10.6093 37.3734 8.51539 34.75 8.51539H6.25C3.62665 8.51539 1.5 10.6093 1.5 13.1923V27.2231C1.5 29.8061 3.62665 31.9 6.25 31.9Z" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
};

export default StaysIcon;