import React from 'react';
import { IconProps } from '../types';

const ArrowUpRightIcon: React.FC<IconProps> = ({ size = 11, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M1 9.33333L9.33333 1M9.33333 1H1M9.33333 1V9.33333"
        stroke="#1E1E1E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ArrowUpRightIcon;