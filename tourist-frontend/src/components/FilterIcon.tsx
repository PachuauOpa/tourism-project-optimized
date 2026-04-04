import React from 'react';
import { IconProps } from '../types';

interface FilterIconProps extends IconProps {
  [key: string]: any; // For spread props
}

const FilterIcon: React.FC<FilterIconProps> = ({ size = 24, className = "", ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M6.46154 12H17.5385M4 7H20M10.1538 17H13.8462"
        stroke="#1E1E1E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default FilterIcon;