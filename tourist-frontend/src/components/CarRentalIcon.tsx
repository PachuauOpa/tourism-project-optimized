import React from 'react';
import { IconProps } from '../types';

const CarRentalIcon: React.FC<IconProps> = ({ size = 35, className = '' }) => {
  return (
    <svg
      width={size}
      height={size * (31/35)}
      viewBox="0 0 35 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M1.5 20.5V15.8415C1.5 13.5784 3.29086 11.7439 5.5 11.7439M1.5 20.5C1.5 22.763 3.29086 24.5976 5.5 24.5976H29.5C31.7091 24.5976 33.5 22.763 33.5 20.5M1.5 20.5V26.7683C1.5 28.277 2.69391 29.5 4.16667 29.5H6.83333C8.30609 29.5 9.5 28.277 9.5 26.7683V24.5976M33.5 20.5V15.8415C33.5 13.5784 31.7091 11.7439 29.5 11.7439H5.5M33.5 20.5V26.7683C33.5 28.277 32.3061 29.5 30.8333 29.5H28.1667C26.6939 29.5 25.5 28.277 25.5 26.7683V24.5976M5.5 11.7439L7.63878 3.52785C7.95007 2.33203 9.00727 1.5 10.2154 1.5H24.9113C26.0591 1.5 27.0782 2.25239 27.4411 3.36787L30.1667 11.7439M6.16667 17.8902H10.8333M24.1667 17.8902H28.8333" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export default CarRentalIcon;